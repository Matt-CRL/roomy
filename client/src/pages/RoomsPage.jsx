import { useState } from 'react'
import AddRoomCard from '../components/rooms/AddRoomCard'
import Button from '../components/common/Button'
import AppNavbar from '../components/layout/AppNavbar'
import RoomCard from '../components/rooms/RoomCard'
import RoomsSummary from '../components/rooms/RoomsSummary'

export default function RoomsPage({
  rooms = [],
  onEnterRoom,
  onAddRoom,
  onRenameRoom,
  onDeleteRoom,
}) {
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [addRoomError, setAddRoomError] = useState('')
  const [roomToRename, setRoomToRename] = useState(null)
  const [renameRoomName, setRenameRoomName] = useState('')
  const [renameRoomError, setRenameRoomError] = useState('')
  const [roomToDelete, setRoomToDelete] = useState(null)

  function openAddRoom() {
    setNewRoomName('')
    setAddRoomError('')
    setIsAddRoomOpen(true)
  }

  function closeAddRoom() {
    setIsAddRoomOpen(false)
    setAddRoomError('')
  }

  function handleAddRoom(event) {
    event.preventDefault()
    const name = newRoomName.trim()

    if (!name) {
      setAddRoomError('Enter a room name to continue.')
      return
    }

    const isDuplicate = rooms.some(
      (room) => room.name.toLowerCase() === name.toLowerCase(),
    )

    if (isDuplicate) {
      setAddRoomError('A room with this name already exists.')
      return
    }

    const roomId = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${Date.now()}`

    onAddRoom?.({
      id: roomId,
      name,
      itemCount: 0,
      storageCount: 0,
    })
    closeAddRoom()
  }

  function confirmDeleteRoom() {
    if (!roomToDelete) return

    onDeleteRoom?.(roomToDelete.id)
    setRoomToDelete(null)
  }

  function openRenameRoom(room) {
    setRoomToRename(room)
    setRenameRoomName(room.name)
    setRenameRoomError('')
  }

  function closeRenameRoom() {
    setRoomToRename(null)
    setRenameRoomError('')
  }

  function handleRenameRoom(event) {
    event.preventDefault()
    const name = renameRoomName.trim()

    if (!name) {
      setRenameRoomError('Enter a room name to continue.')
      return
    }

    const isDuplicate = rooms.some(
      (room) =>
        room.id !== roomToRename?.id &&
        room.name.toLowerCase() === name.toLowerCase(),
    )

    if (isDuplicate) {
      setRenameRoomError('A room with this name already exists.')
      return
    }

    onRenameRoom?.(roomToRename.id, name)
    closeRenameRoom()
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-screen-2xl">
        <AppNavbar />

        <header className="mb-8 pt-3">
          <h1 className="text-3xl font-bold text-slate-900">
            Your rooms
          </h1>

          <p className="mt-2 text-slate-600">
            Keep track of what you own and where it belongs.
          </p>
        </header>

        <RoomsSummary rooms={rooms} />

        <section aria-labelledby="rooms-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="rooms-heading"
              className="text-xl font-semibold text-slate-900"
            >
              Rooms ({rooms.length})
            </h2>

            <Button variant="primary" onClick={openAddRoom}>
              + Add room
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <AddRoomCard onClick={openAddRoom} />

            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onEnter={onEnterRoom}
                onRename={openRenameRoom}
                onDelete={setRoomToDelete}
              />
            ))}
          </div>
        </section>

        {isAddRoomOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
            role="presentation"
            onMouseDown={closeAddRoom}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-room-title"
              className="w-full max-w-md border border-slate-300 bg-white p-6 shadow-xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2 id="add-room-title" className="text-xl font-semibold text-slate-900">
                Add room
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Name it now. You can add items and plan it later.
              </p>

              <form onSubmit={handleAddRoom} className="mt-5">
                <label className="block text-xs font-semibold text-slate-900">
                  Room name
                  <input
                    autoFocus
                    value={newRoomName}
                    onChange={(event) => {
                      setNewRoomName(event.target.value)
                      setAddRoomError('')
                    }}
                    placeholder="e.g. Office"
                    className="mt-2 min-h-11 w-full border border-slate-300 px-3 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </label>

                {addRoomError && (
                  <p role="alert" className="mt-2 text-xs text-red-600">
                    {addRoomError}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="secondary" type="button" onClick={closeAddRoom}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Add room
                  </Button>
                </div>
              </form>
            </section>
          </div>
        )}

        {roomToRename && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
            role="presentation"
            onMouseDown={closeRenameRoom}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="rename-room-title"
              className="w-full max-w-md border border-slate-300 bg-white p-6 shadow-xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2
                id="rename-room-title"
                className="text-xl font-semibold text-slate-900"
              >
                Rename room
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Choose a new name for {roomToRename.name}.
              </p>

              <form onSubmit={handleRenameRoom} className="mt-5">
                <label className="block text-xs font-semibold text-slate-900">
                  Room name
                  <input
                    autoFocus
                    value={renameRoomName}
                    onChange={(event) => {
                      setRenameRoomName(event.target.value)
                      setRenameRoomError('')
                    }}
                    className="mt-2 min-h-11 w-full border border-slate-300 px-3 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </label>

                {renameRoomError && (
                  <p role="alert" className="mt-2 text-xs text-red-600">
                    {renameRoomError}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={closeRenameRoom}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Save name
                  </Button>
                </div>
              </form>
            </section>
          </div>
        )}

        {roomToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
            role="presentation"
            onMouseDown={() => setRoomToDelete(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-room-title"
              aria-describedby="delete-room-description"
              className="w-full max-w-md border border-slate-300 bg-white p-6 shadow-xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2
                id="delete-room-title"
                className="text-xl font-semibold text-slate-900"
              >
                Delete {roomToDelete.name}?
              </h2>

              <p
                id="delete-room-description"
                className="mt-2 text-sm text-slate-600"
              >
                This permanently deletes the room and its{' '}
                {roomToDelete.itemCount ?? 0}{' '}
                {roomToDelete.itemCount === 1 ? 'item' : 'items'}. This action
                cannot be undone.
              </p>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setRoomToDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={confirmDeleteRoom}
                >
                  Delete room
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
