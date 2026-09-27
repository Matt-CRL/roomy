import { USING_MOCK_API } from '../api'

// Shown only while the simulated backend is switched on. It disappears by
// itself the moment you set VITE_USE_MOCK_API=false, because it reads the same
// variable the API layer does.
//
// Leave this in. A deployment that quietly pretends to have a server is the
// difference between a deliberate staging site and a submission hoping nobody
// checks.
export default function DemoNotice() {
  if (!USING_MOCK_API) return null

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-6 py-2 text-center text-xs text-amber-950" role="status">
      <strong>Demo mode.</strong> Changes stay in this browser and are not saved
      to your account or PostgreSQL. See the README for real-mode setup.
    </div>
  )
}
