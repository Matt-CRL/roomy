const userContextClients = new WeakSet()
const contextHooks = new WeakMap()

export function hasUserContext(db) {
  return userContextClients.has(db)
}

function registerHook(db, type, hook) {
  const hooks = contextHooks.get(db)
  if (!hooks) throw new Error('A transaction-local user context is required')
  hooks[type].push(hook)
}

export function afterUserCommit(db, hook) {
  registerHook(db, 'afterCommit', hook)
}

export function afterUserRollback(db, hook) {
  registerHook(db, 'afterRollback', hook)
}

export async function withUserContext(pool, userId, work) {
  const db = await pool.connect()
  let committed = false
  try {
    await db.query('BEGIN')
    await db.query("SELECT set_config('roomy.user_id', $1, true)", [userId])
    userContextClients.add(db)
    contextHooks.set(db, { afterCommit: [], afterRollback: [] })
    const result = await work(db)
    await db.query('COMMIT')
    committed = true
    for (const hook of contextHooks.get(db).afterCommit) await hook()
    return result
  } catch (error) {
    if (!committed) {
      await db.query('ROLLBACK').catch(() => {})
      const hooks = contextHooks.get(db)?.afterRollback ?? []
      await Promise.allSettled(hooks.map((hook) => hook()))
    }
    throw error
  } finally {
    userContextClients.delete(db)
    contextHooks.delete(db)
    db.release()
  }
}
