import AddRoomCard from '../components/rooms/AddRoomCard'
import Button from '../components/common/Button'
import AppNavbar from '../components/layout/AppNavbar'
import RoomCard from '../components/rooms/RoomCard'
import RoomsSummary from '../components/rooms/RoomsSummary'

const sampleRooms = [
  {
    id: 'bedroom-1',
    name: 'Bedroom 1',
    itemCount: 12,
    storageCount: 2,
  },
  {
    id: 'bedroom-2',
    name: 'Bedroom 2',
    itemCount: 8,
    storageCount: 1,
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    itemCount: 6,
    storageCount: 2,
  },
]

export default function RoomsPage({ onEnterRoom }) {
  function handleAddRoom() {
    console.log('Add room')
  }

  function handleRoomOptions(room) {
    console.log('Room options:', room)
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

        <RoomsSummary rooms={sampleRooms} />

        <section aria-labelledby="rooms-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="rooms-heading"
              className="text-xl font-semibold text-slate-900"
            >
              Rooms ({sampleRooms.length})
            </h2>

            <Button variant="primary" onClick={handleAddRoom}>
              + Add room
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <AddRoomCard onClick={handleAddRoom} />

            {sampleRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onEnter={onEnterRoom}
                onOptions={handleRoomOptions}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
