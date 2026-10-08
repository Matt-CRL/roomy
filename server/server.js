import app from './app.js'
import { processPhotoJobs } from './photos.js'
import { initializeServer } from './startup.js'

await initializeServer()

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Roomy API listening on port ${port}`))
if (!process.env.VERCEL) {
  const cleanupTimer = setInterval(() => {
    processPhotoJobs().catch((error) => console.error('Photo cleanup retry failed:', error.message))
  }, 5 * 60 * 1000)
  cleanupTimer.unref()
}
