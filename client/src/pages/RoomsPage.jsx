import { useEffect, useRef, useState } from 'react'
import AddRoomCard from '../components/rooms/AddRoomCard'
import Button from '../components/common/Button'
import AppNavbar from '../components/layout/AppNavbar'
import RoomCard from '../components/rooms/RoomCard'
import RoomsSummary from '../components/rooms/RoomsSummary'

const DEFAULT_ROOM_DIMENSION = 300
const ROOM_WALL_THICKNESS_PX = 8
const DEFAULT_PREVIEW_SCALE = Math.min(260 / DEFAULT_ROOM_DIMENSION, 220 / DEFAULT_ROOM_DIMENSION)
const PREVIEW_BOX_WIDTH_CM = 50
const PREVIEW_BOX_DEPTH_CM = 30

function getRotatedBoxBounds(rotation) {
  const radians = (rotation * Math.PI) / 180
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))
  const roundDimension = (value) => Math.round(value * 10000) / 10000

  return {
    widthCm: roundDimension(PREVIEW_BOX_WIDTH_CM * cosine + PREVIEW_BOX_DEPTH_CM * sine),
    depthCm: roundDimension(PREVIEW_BOX_WIDTH_CM * sine + PREVIEW_BOX_DEPTH_CM * cosine),
  }
}

function normalizeAngle(angle) {
  return (angle + 360) % 360
}

function angleDifference(firstAngle, secondAngle) {
  return ((firstAngle - secondAngle + 540) % 360) - 180
}

function snapRotation(angle) {
  const normalizedAngle = normalizeAngle(angle)
  const nearestSnap = normalizeAngle(Math.round(normalizedAngle / 45) * 45)

  return Math.abs(angleDifference(normalizedAngle, nearestSnap)) <= 8
    ? nearestSnap
    : normalizedAngle
}

export default function RoomsPage({
  rooms = [],
  onEnterRoom,
  onAddRoom,
  onRenameRoom,
  onDeleteRoom,
  onSignOut,
  displayName,
  isLoading = false,
}) {
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newWidth, setNewWidth] = useState('')
  const [newDepth, setNewDepth] = useState('')
  const [addRoomError, setAddRoomError] = useState('')
  const [roomToRename, setRoomToRename] = useState(null)
  const [renameRoomName, setRenameRoomName] = useState('')
  const [renameWidth, setRenameWidth] = useState('')
  const [renameDepth, setRenameDepth] = useState('')
  const [renameRoomError, setRenameRoomError] = useState('')
  const [roomToDelete, setRoomToDelete] = useState(null)
  const [deleteRoomError, setDeleteRoomError] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 })
  const [isPreviewPanning, setIsPreviewPanning] = useState(false)
  const [selectedWall, setSelectedWall] = useState(null)
  const [hoveredWall, setHoveredWall] = useState(null)
  const [isWallDragging, setIsWallDragging] = useState(false)
  const [hasPreviewBox, setHasPreviewBox] = useState(false)
  const [previewBoxPosition, setPreviewBoxPosition] = useState(null)
  const [previewBoxRotation, setPreviewBoxRotation] = useState(0)
  const [isPreviewBoxDragging, setIsPreviewBoxDragging] = useState(false)
  const [isPreviewBoxHovered, setIsPreviewBoxHovered] = useState(false)
  const [isPreviewBoxSelected, setIsPreviewBoxSelected] = useState(false)
  const [isPreviewBoxRotating, setIsPreviewBoxRotating] = useState(false)
  const [rotationCursor, setRotationCursor] = useState(null)
  const previewDrag = useRef(null)
  const wallDrag = useRef(null)
  const previewBoxDrag = useRef(null)
  const previewBoxRotationDrag = useRef(null)

  useEffect(() => {
    if (!isAddRoomOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isAddRoomOpen])

  function openAddRoom() {
    setNewRoomName('')
    setNewWidth(String(DEFAULT_ROOM_DIMENSION))
    setNewDepth(String(DEFAULT_ROOM_DIMENSION))
    setPreviewZoom(1)
    setPreviewPan({ x: 0, y: 0 })
    setSelectedWall(null)
    setHoveredWall(null)
    setHasPreviewBox(false)
    setPreviewBoxPosition(null)
    setPreviewBoxRotation(0)
    setIsPreviewBoxDragging(false)
    setIsPreviewBoxHovered(false)
    setIsPreviewBoxSelected(false)
    setIsPreviewBoxRotating(false)
    setRotationCursor(null)
    setAddRoomError('')
    setIsAddRoomOpen(true)
  }

  function closeAddRoom() {
    setIsAddRoomOpen(false)
    setAddRoomError('')
  }

  async function handleAddRoom(event) {
    event.preventDefault()
    const name = newRoomName.trim()
    const width = Number(newWidth)
    const depth = Number(newDepth)

    if (!name) {
      setAddRoomError('Enter a room name to continue.')
      return
    }

    if (!Number.isFinite(width) || !Number.isFinite(depth) || width < 1 || depth < 1) {
      setAddRoomError('Width and depth must each be at least 1 cm.')
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

    try {
      setBusyAction('add')
      await onAddRoom?.({
        id: roomId, name, widthCm: width, depthCm: depth,
        itemCount: 0, storageCount: 0,
      })
      closeAddRoom()
    } catch (error) { setAddRoomError(error.message) }
    finally { setBusyAction('') }
  }

  const previewWidthCm = Number(newWidth) > 0 ? Number(newWidth) : DEFAULT_ROOM_DIMENSION
  const previewDepthCm = Number(newDepth) > 0 ? Number(newDepth) : DEFAULT_ROOM_DIMENSION
  const fittedPreviewScale = Math.min(
    260 / previewWidthCm,
    220 / previewDepthCm,
    DEFAULT_PREVIEW_SCALE,
  )
  const previewScale = isWallDragging && wallDrag.current
    ? wallDrag.current.scale
    : fittedPreviewScale
  const wallThickness = Math.max(
    2,
    Math.round(ROOM_WALL_THICKNESS_PX * (previewScale / DEFAULT_PREVIEW_SCALE)),
  )
  const previewWidth = Math.max(1, Math.round(previewWidthCm * previewScale))
  const previewHeight = Math.max(1, Math.round(previewDepthCm * previewScale))
      const previewBoxBounds = getRotatedBoxBounds(previewBoxRotation)
      const previewBoxWidthCm = PREVIEW_BOX_WIDTH_CM
      const previewBoxDepthCm = PREVIEW_BOX_DEPTH_CM
      const previewBoxWidth = Math.max(1, Math.round(previewBoxWidthCm * previewScale))
      const previewBoxHeight = Math.max(1, Math.round(previewBoxDepthCm * previewScale))
      const previewBoxFitsRoom = previewWidthCm >= previewBoxBounds.widthCm && previewDepthCm >= previewBoxBounds.depthCm
      const rotationGuideSize = Math.max(previewBoxWidth, previewBoxHeight) + 24
      const rotationRadians = (previewBoxRotation * Math.PI) / 180
      const rotationCosine = Math.abs(Math.cos(rotationRadians))
      const rotationSine = Math.abs(Math.sin(rotationRadians))
      const renderedPreviewBoxWidth = previewBoxWidth * rotationCosine + previewBoxHeight * rotationSine
      const renderedPreviewBoxHeight = previewBoxWidth * rotationSine + previewBoxHeight * rotationCosine
      const defaultPreviewBoxCenterX = previewWidthCm / 2
      const defaultPreviewBoxCenterY = previewDepthCm / 2
      const requestedPreviewBoxCenterX = (previewBoxPosition?.xCm ?? defaultPreviewBoxCenterX - previewBoxWidthCm / 2) + previewBoxWidthCm / 2
      const requestedPreviewBoxCenterY = (previewBoxPosition?.yCm ?? defaultPreviewBoxCenterY - previewBoxDepthCm / 2) + previewBoxDepthCm / 2
      const clampedPreviewBoxCenter = {
        xCm: Math.min(
          Math.max(renderedPreviewBoxWidth / 2, requestedPreviewBoxCenterX * previewScale),
          previewWidth - renderedPreviewBoxWidth / 2,
        ) / previewScale,
        yCm: Math.min(
          Math.max(renderedPreviewBoxHeight / 2, requestedPreviewBoxCenterY * previewScale),
          previewHeight - renderedPreviewBoxHeight / 2,
        ) / previewScale,
      }
      const clampedPreviewBoxPosition = {
        xCm: clampedPreviewBoxCenter.xCm - previewBoxWidthCm / 2,
        yCm: clampedPreviewBoxCenter.yCm - previewBoxDepthCm / 2,
      }
  const minimumRoomWidthCm = hasPreviewBox
    ? Math.max(1, Math.ceil(previewBoxBounds.widthCm * 10) / 10)
    : 1
  const minimumRoomDepthCm = hasPreviewBox
    ? Math.max(1, Math.ceil(previewBoxBounds.depthCm * 10) / 10)
    : 1
  const widthDimensionArrowSize = Math.min(8, Math.max(1, previewWidth / 3))
  const heightDimensionArrowSize = Math.min(8, Math.max(1, previewHeight / 3))
  const widthDimensionStrokeWidth = Math.min(1.5, Math.max(0.75, previewWidth / 16))
  const heightDimensionStrokeWidth = Math.min(1.5, Math.max(0.75, previewHeight / 16))
  const hasWidthArrowheads = previewWidth >= 8
  const hasHeightArrowheads = previewHeight >= 8
  const roomWalls = [
    {
      id: 'top',
      label: 'Select top wall',
      style: {
        left: 38,
        top: 38 - wallThickness,
        width: previewWidth,
        height: wallThickness,
      },
    },
    {
      id: 'right',
      label: 'Select right wall',
      style: {
        left: 38 + previewWidth,
        top: 38,
        width: wallThickness,
        height: previewHeight,
      },
    },
    {
      id: 'bottom',
      label: 'Select bottom wall',
      style: {
        left: 38,
        top: 38 + previewHeight,
        width: previewWidth,
        height: wallThickness,
      },
    },
    {
      id: 'left',
      label: 'Select left wall',
      style: {
        left: 38 - wallThickness,
        top: 38,
        width: wallThickness,
        height: previewHeight,
      },
    },
  ]

  function changePreviewZoom(amount, focalPoint = null) {
    const nextZoom = Math.min(2.5, Math.max(0.5, previewZoom + amount))

    if (nextZoom === previewZoom) return

    if (focalPoint) {
      const zoomRatio = nextZoom / previewZoom
      setPreviewPan((currentPan) => ({
        x: focalPoint.x - zoomRatio * (focalPoint.x - currentPan.x),
        y: focalPoint.y - zoomRatio * (focalPoint.y - currentPan.y),
      }))
    }

    setPreviewZoom(nextZoom)
  }

  function resetPreviewView() {
    setPreviewZoom(1)
    setPreviewPan({ x: 0, y: 0 })
  }

  function handlePreviewWheel(event) {
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    changePreviewZoom(event.deltaY < 0 ? 0.1 : -0.1, {
      x: event.clientX - bounds.left - bounds.width / 2,
      y: event.clientY - bounds.top - bounds.height / 2,
    })
  }

  function handlePreviewPointerDown(event) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    previewDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: previewPan,
    }
    setIsPreviewPanning(true)
  }

  function handlePreviewPointerMove(event) {
    if (!previewDrag.current) return
    setPreviewPan({
      x: previewDrag.current.startPan.x + event.clientX - previewDrag.current.startX,
      y: previewDrag.current.startPan.y + event.clientY - previewDrag.current.startY,
    })
  }

  function handlePreviewPointerUp(event) {
    if (previewDrag.current?.pointerId !== event.pointerId) return
    previewDrag.current = null
    setIsPreviewPanning(false)
  }

  function handleWallPointerDown(event, wall) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    wallDrag.current = {
      wallId: wall.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialWidth: previewWidthCm,
      initialDepth: previewDepthCm,
      scale: previewScale,
      zoom: previewZoom,
      initialPan: previewPan,
    }
    setSelectedWall(wall.id)
    setIsWallDragging(true)
  }

  function handleWallPointerMove(event) {
    if (!wallDrag.current) return
    const {
      wallId,
      startX,
      startY,
      initialWidth,
      initialDepth,
      scale,
      zoom,
      initialPan,
    } = wallDrag.current
    const screenDeltaX = event.clientX - startX
    const screenDeltaY = event.clientY - startY
    const deltaX = screenDeltaX / (scale * zoom)
    const deltaY = screenDeltaY / (scale * zoom)
    const nextWidth = wallId === 'right'
      ? initialWidth + deltaX
      : wallId === 'left'
        ? initialWidth - deltaX
        : initialWidth
    const nextDepth = wallId === 'bottom'
      ? initialDepth + deltaY
      : wallId === 'top'
        ? initialDepth - deltaY
        : initialDepth
    const clampDimension = (value, minimum) => Math.min(100000, Math.max(minimum, Math.round(value * 100) / 100))

    if (wallId === 'left' || wallId === 'right') setNewWidth(String(clampDimension(nextWidth, minimumRoomWidthCm)))
    if (wallId === 'top' || wallId === 'bottom') setNewDepth(String(clampDimension(nextDepth, minimumRoomDepthCm)))
    setPreviewPan({
      x: initialPan.x + (wallId === 'left' || wallId === 'right' ? screenDeltaX / 2 : 0),
      y: initialPan.y + (wallId === 'top' || wallId === 'bottom' ? screenDeltaY / 2 : 0),
    })
    setAddRoomError('')
  }

  function handleWallPointerUp(event) {
    if (wallDrag.current?.pointerId !== event.pointerId) return
    wallDrag.current = null
    setIsWallDragging(false)
  }

  function handlePreviewBoxPointerDown(event) {
    event.stopPropagation()
    if (!hasPreviewBox || !previewBoxFitsRoom) return

    setIsPreviewBoxSelected(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    previewBoxDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialPosition: clampedPreviewBoxPosition,
      scale: previewScale,
      zoom: previewZoom,
    }
    setIsPreviewBoxDragging(true)
  }

  function handlePreviewBoxPointerMove(event) {
    if (previewBoxDrag.current?.pointerId !== event.pointerId) return

    const {
      startX,
      startY,
      initialPosition,
      scale,
      zoom,
    } = previewBoxDrag.current
    const deltaX = (event.clientX - startX) / (scale * zoom)
    const deltaY = (event.clientY - startY) / (scale * zoom)
        const clamp = (value, min, max) => min > max ? (min + max) / 2 : Math.min(Math.max(value, min), max)

        const nextCenterX = clamp(
          initialPosition.xCm + PREVIEW_BOX_WIDTH_CM / 2 + deltaX,
          previewBoxBounds.widthCm / 2,
          previewWidthCm - previewBoxBounds.widthCm / 2,
        )
        const nextCenterY = clamp(
          initialPosition.yCm + PREVIEW_BOX_DEPTH_CM / 2 + deltaY,
          previewBoxBounds.depthCm / 2,
          previewDepthCm - previewBoxBounds.depthCm / 2,
        )
        setPreviewBoxPosition({
          xCm: nextCenterX - PREVIEW_BOX_WIDTH_CM / 2,
          yCm: nextCenterY - PREVIEW_BOX_DEPTH_CM / 2,
        })
  }

  function handlePreviewBoxPointerUp(event) {
    if (previewBoxDrag.current?.pointerId !== event.pointerId) return
    previewBoxDrag.current = null
    setIsPreviewBoxDragging(false)
  }

  function handlePreviewBoxRotationPointerDown(event) {
    event.preventDefault()
    event.stopPropagation()

    const boxElement = event.currentTarget.closest('[data-preview-box]')
    const previewPanel = event.currentTarget.closest('[data-room-preview-panel]')
    const boxBounds = boxElement?.getBoundingClientRect()
    const panelBounds = previewPanel?.getBoundingClientRect()

    if (!boxBounds || !panelBounds || !hasPreviewBox || !previewBoxFitsRoom) return

    const centerX = boxBounds.left + boxBounds.width / 2
    const centerY = boxBounds.top + boxBounds.height / 2
    const pointerAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI)

    event.currentTarget.setPointerCapture(event.pointerId)
    previewBoxRotationDrag.current = {
      pointerId: event.pointerId,
      centerX,
      centerY,
      startPointerAngle: pointerAngle,
      startRotation: previewBoxRotation,
      panelBounds,
    }
    setIsPreviewBoxSelected(true)
    setIsPreviewBoxRotating(true)
    setRotationCursor({
      x: event.clientX - panelBounds.left,
      y: event.clientY - panelBounds.top,
      degrees: previewBoxRotation,
    })
  }

  function handlePreviewBoxRotationPointerMove(event) {
    if (previewBoxRotationDrag.current?.pointerId !== event.pointerId) return

    const {
      centerX,
      centerY,
      startPointerAngle,
      startRotation,
      panelBounds,
    } = previewBoxRotationDrag.current
    const pointerAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI)
    const nextRotation = snapRotation(startRotation + angleDifference(pointerAngle, startPointerAngle))
    const nextBounds = getRotatedBoxBounds(nextRotation)

    setRotationCursor({
      x: event.clientX - panelBounds.left,
      y: event.clientY - panelBounds.top,
      degrees: nextRotation,
    })

    if (previewWidthCm < nextBounds.widthCm || previewDepthCm < nextBounds.depthCm) return

    const currentCenterX = clampedPreviewBoxPosition.xCm + PREVIEW_BOX_WIDTH_CM / 2
    const currentCenterY = clampedPreviewBoxPosition.yCm + PREVIEW_BOX_DEPTH_CM / 2
    const nextCenterX = Math.min(
      Math.max(currentCenterX, nextBounds.widthCm / 2),
      previewWidthCm - nextBounds.widthCm / 2,
    )
    const nextCenterY = Math.min(
      Math.max(currentCenterY, nextBounds.depthCm / 2),
      previewDepthCm - nextBounds.depthCm / 2,
    )

    setPreviewBoxRotation(nextRotation)
    if (nextCenterX !== currentCenterX || nextCenterY !== currentCenterY) {
      setPreviewBoxPosition({
        xCm: nextCenterX - PREVIEW_BOX_WIDTH_CM / 2,
        yCm: nextCenterY - PREVIEW_BOX_DEPTH_CM / 2,
      })
    }
  }

  function handlePreviewBoxRotationPointerUp(event) {
    if (previewBoxRotationDrag.current?.pointerId !== event.pointerId) return
    previewBoxRotationDrag.current = null
    setIsPreviewBoxRotating(false)
    setRotationCursor(null)
  }

  async function confirmDeleteRoom() {
    if (!roomToDelete) return
    try { setBusyAction('delete'); await onDeleteRoom?.(roomToDelete.id); setRoomToDelete(null) }
    catch (error) { setDeleteRoomError(error.message) }
    finally { setBusyAction('') }
  }

  function openRenameRoom(room) {
    setRoomToRename(room)
    setRenameRoomName(room.name)
    setRenameWidth(room.widthCm ?? '')
    setRenameDepth(room.depthCm ?? '')
    setRenameRoomError('')
  }

  function closeRenameRoom() {
    setRoomToRename(null)
    setRenameRoomError('')
  }

  async function handleRenameRoom(event) {
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

    try { setBusyAction('rename'); await onRenameRoom?.(roomToRename.id, name, Number(renameWidth), Number(renameDepth)); closeRenameRoom() }
    catch (error) { setRenameRoomError(error.message) }
    finally { setBusyAction('') }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-screen-2xl">
        <AppNavbar onSignOut={onSignOut} displayName={displayName} />

        <header className="mb-8 pt-3">
          <h1 className="text-3xl font-bold text-slate-900">
            Your rooms
          </h1>

          <p className="mt-2 text-slate-600">
            Keep track of what you own and where it belongs.
          </p>
        </header>

        <RoomsSummary rooms={rooms} loading={isLoading} />

        <section aria-labelledby="rooms-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="rooms-heading"
              className="text-xl font-semibold text-slate-900"
            >
              Rooms ({rooms.length})
            </h2>

            <Button variant="primary" onClick={openAddRoom} disabled={isLoading || Boolean(busyAction)}>
              {busyAction === 'add' ? 'Creating…' : 'Create room'}
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3" aria-busy="true" aria-label="Loading rooms">
              {[0, 1, 2].map((skeleton) => (
                <div key={skeleton} className="animate-pulse overflow-hidden border border-slate-300 bg-white">
                  <div className="h-28 bg-slate-200" />
                  <div className="space-y-3 p-3">
                    <div className="h-4 w-28 bg-slate-200" />
                    <div className="h-3 w-36 bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center border border-dashed border-slate-300 bg-white p-8 text-center">
              <img
                src="/empty-room-planner.png"
                alt=""
                className="h-24 w-24 object-contain"
              />
              <h3 className="mt-5 text-base font-semibold text-slate-900">
                No rooms available yet
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                Create a room first to start organizing your items.
              </p>
              <Button variant="primary" className="mt-5" onClick={openAddRoom}>
                Create room
              </Button>
            </div>
          ) : (
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
          )}
        </section>

        {isAddRoomOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-6"
            role="presentation"
            onMouseDown={closeAddRoom}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-room-title"
              className="night-form-surface w-full max-w-4xl border border-slate-300 bg-white p-7 shadow-xl sm:p-8"
              onPointerDown={(event) => {
                if (!event.target.closest('[data-room-wall]')) {
                  setSelectedWall(null)
                }
                if (!event.target.closest('[data-preview-box]')) {
                  setIsPreviewBoxSelected(false)
                }
                event.stopPropagation()
              }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="grid gap-8 md:grid-cols-[270px_minmax(0,1fr)] md:items-stretch">
                <div>
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

                    <label className="mt-4 block text-xs font-semibold text-slate-900">
                      Width (cm)
                      <input
                        required
                        type="number"
                        min={minimumRoomWidthCm}
                        max="100000"
                        step="0.1"
                        value={newWidth}
                        onChange={(event) => {
                          const value = event.target.value
                          setNewWidth(value === '' ? '' : String(Math.max(minimumRoomWidthCm, Number(value))))
                          setAddRoomError('')
                        }}
                        onBlur={() => {
                          if (newWidth === '' || Number(newWidth) < minimumRoomWidthCm) setNewWidth(String(minimumRoomWidthCm))
                        }}
                        className="room-dimension-input mt-2 min-h-11 w-full border border-slate-300 px-3 py-0 text-xs font-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </label>

                    <label className="mt-4 block text-xs font-semibold text-slate-900">
                      Depth (cm)
                      <input
                        required
                        type="number"
                        min={minimumRoomDepthCm}
                        max="100000"
                        step="0.1"
                        value={newDepth}
                        onChange={(event) => {
                          const value = event.target.value
                          setNewDepth(value === '' ? '' : String(Math.max(minimumRoomDepthCm, Number(value))))
                          setAddRoomError('')
                        }}
                        onBlur={() => {
                          if (newDepth === '' || Number(newDepth) < minimumRoomDepthCm) setNewDepth(String(minimumRoomDepthCm))
                        }}
                        className="room-dimension-input mt-2 min-h-11 w-full border border-slate-300 px-3 py-0 text-xs font-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </label>

                    <p className="mt-2 text-xs font-normal text-slate-500">
                      You can edit the room dimensions later after creating it.
                    </p>

                    {addRoomError && (
                      <p role="alert" className="mt-2 text-xs text-red-600">
                        {addRoomError}
                      </p>
                    )}

                    <div className="mt-6 flex w-full gap-2">
                      <Button variant="secondary" type="button" onClick={closeAddRoom} disabled={busyAction === 'add'} className="flex-1">
                        Cancel
                      </Button>
                      <Button variant="primary" type="submit" disabled={busyAction === 'add'} className="flex-1">
                        {busyAction === 'add' ? 'Creating…' : 'Create room'}
                      </Button>
                    </div>
                  </form>
                </div>

                <aside
                  className="room-preview-grid relative flex min-h-[540px] flex-col overflow-hidden border border-slate-200 bg-slate-50 p-5"
                  aria-label="Room preview"
                  data-room-preview-panel
                  style={{
                    backgroundSize: `${16 * previewZoom}px ${16 * previewZoom}px`,
                    backgroundPosition: '0 0',
                  }}
                  >
                    <p className="pointer-events-none absolute left-5 top-5 z-20 text-[10px] font-medium text-slate-500 opacity-70">
                      Room preview
                    </p>
                    <p className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2 text-xs font-semibold text-slate-900 opacity-70" aria-live="polite">
                      {previewWidthCm} × {previewDepthCm} cm
                    </p>
                    <span className="pointer-events-none absolute right-5 top-5 z-20 text-[10px] font-medium text-slate-500 opacity-70">Top view</span>
                    <div className="pointer-events-auto absolute bottom-3 left-3 z-30 flex items-center gap-2">
                      <Button
                        variant="secondary"
                        type="button"
                        aria-pressed={hasPreviewBox}
                        disabled={!hasPreviewBox && !previewBoxFitsRoom}
                        title={hasPreviewBox ? 'Hide the person preview' : previewBoxFitsRoom ? 'Add a 50 by 30 centimetre person preview' : 'The room must be large enough to contain the person preview'}
                        onClick={() => {
                          if (hasPreviewBox) {
                            setHasPreviewBox(false)
                            return
                          }

                          setHasPreviewBox(true)
                          setPreviewBoxPosition((currentPosition) => currentPosition ?? {
                            xCm: Math.max(0, (previewWidthCm - previewBoxWidthCm) / 2),
                            yCm: Math.max(0, (previewDepthCm - previewBoxDepthCm) / 2),
                          })
                        }}
                        className="min-h-9 px-3 py-2 text-xs"
                      >
                        {hasPreviewBox ? 'Hide person' : '+ Add person'}
                      </Button>
                    </div>
                    {isPreviewBoxRotating && rotationCursor && (
                      <span
                        className="pointer-events-none absolute z-50 rounded-sm bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                        style={{
                          left: `${rotationCursor.x + 12}px`,
                          top: `${rotationCursor.y + 12}px`,
                        }}
                      >
                        {Math.round(rotationCursor.degrees)}°
                      </span>
                    )}

                  <div
                    className={`absolute inset-0 z-10 touch-none select-none overflow-hidden ${isPreviewPanning ? 'cursor-grabbing' : 'cursor-default'}`}
                    onWheel={handlePreviewWheel}
                    onPointerDown={handlePreviewPointerDown}
                    onPointerMove={handlePreviewPointerMove}
                    onPointerUp={handlePreviewPointerUp}
                    onPointerCancel={handlePreviewPointerUp}
                  >
                    <div
                      className={`absolute ${isPreviewPanning ? '' : 'transition-[width,height,transform] duration-200'}`}
                      style={{
                        width: `${previewWidth + 76}px`,
                        height: `${previewHeight + 76}px`,
                        transform: `translate(calc(-50% + ${previewPan.x}px), calc(-50% + ${previewPan.y}px)) scale(${previewZoom})`,
                        transformOrigin: 'center',
                        left: '50%',
                        top: '50%',
                      }}
                      aria-label={`Room preview measuring ${previewWidthCm} centimeters wide by ${previewDepthCm} centimeters deep`}
                    >
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 overflow-visible"
                        shapeRendering="geometricPrecision"
                        width={previewWidth + 76}
                        height={previewHeight + 76}
                        viewBox={`0 0 ${previewWidth + 76} ${previewHeight + 76}`}
                      >
                        <defs>
                          <marker id="room-width-arrow-start" markerWidth={widthDimensionArrowSize} markerHeight={widthDimensionArrowSize} viewBox="0 0 8 8" refX="0" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                            <path d="M 0 4 L 8 0 L 8 8 Z" fill="#f97316" />
                          </marker>
                          <marker id="room-width-arrow-end" markerWidth={widthDimensionArrowSize} markerHeight={widthDimensionArrowSize} viewBox="0 0 8 8" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                            <path d="M 8 4 L 0 0 L 0 8 Z" fill="#f97316" />
                          </marker>
                          <marker id="room-depth-arrow-start" markerWidth={heightDimensionArrowSize} markerHeight={heightDimensionArrowSize} viewBox="0 0 8 8" refX="0" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                            <path d="M 0 4 L 8 0 L 8 8 Z" fill="#f97316" />
                          </marker>
                          <marker id="room-depth-arrow-end" markerWidth={heightDimensionArrowSize} markerHeight={heightDimensionArrowSize} viewBox="0 0 8 8" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                            <path d="M 8 4 L 0 0 L 0 8 Z" fill="#f97316" />
                          </marker>
                        </defs>
                        <line
                          x1="38"
                          y1="18"
                          x2={38 + previewWidth}
                          y2="18"
                          stroke="#f97316"
                          strokeOpacity="1"
                          strokeWidth={widthDimensionStrokeWidth}
                          markerStart={hasWidthArrowheads ? 'url(#room-width-arrow-start)' : undefined}
                          markerEnd={hasWidthArrowheads ? 'url(#room-width-arrow-end)' : undefined}
                        />
                        <line x1="38" y1="18" x2="38" y2="38" stroke="#f97316" strokeOpacity="1" strokeWidth={widthDimensionStrokeWidth} />
                        <line x1={38 + previewWidth} y1="18" x2={38 + previewWidth} y2="38" stroke="#f97316" strokeOpacity="1" strokeWidth={widthDimensionStrokeWidth} />
                        <line
                          x1="18"
                          y1="38"
                          x2="18"
                          y2={38 + previewHeight}
                          stroke="#f97316"
                          strokeOpacity="1"
                          strokeWidth={heightDimensionStrokeWidth}
                          markerStart={hasHeightArrowheads ? 'url(#room-depth-arrow-start)' : undefined}
                          markerEnd={hasHeightArrowheads ? 'url(#room-depth-arrow-end)' : undefined}
                        />
                        <line x1="18" y1="38" x2="38" y2="38" stroke="#f97316" strokeOpacity="1" strokeWidth={heightDimensionStrokeWidth} />
                        <line x1="18" y1={38 + previewHeight} x2="38" y2={38 + previewHeight} stroke="#f97316" strokeOpacity="1" strokeWidth={heightDimensionStrokeWidth} />
                      </svg>

                      <span
                        className="absolute top-0 text-center text-[10px] font-semibold text-orange-500"
                        style={{ left: `${38 + previewWidth / 2}px`, transform: 'translateX(-50%)' }}
                      >
                        {previewWidthCm} cm
                      </span>
                      <span
                        className="absolute whitespace-nowrap text-[10px] font-semibold text-orange-500"
                        style={{
                          left: '6px',
                          top: `${38 + previewHeight / 2}px`,
                          transform: 'translate(-50%, -50%) rotate(-90deg)',
                        }}
                      >
                        {previewDepthCm} cm
                      </span>
                      <div
                        className="absolute bg-slate-200 shadow-sm transition-[width,height] duration-200"
                        style={{
                          left: '37px',
                          top: '37px',
                          width: `${previewWidth + 2}px`,
                          height: `${previewHeight + 2}px`,
                        }}
                      />
                      {hasPreviewBox && isPreviewBoxSelected && isPreviewBoxRotating && (
                        <div
                          className="pointer-events-none absolute z-0 rounded-full"
                          style={{
                            left: `${38 + clampedPreviewBoxPosition.xCm * previewScale + previewBoxWidth / 2 - rotationGuideSize / 2}px`,
                            top: `${38 + clampedPreviewBoxPosition.yCm * previewScale + previewBoxHeight / 2 - rotationGuideSize / 2}px`,
                            width: `${rotationGuideSize}px`,
                            height: `${rotationGuideSize}px`,
                          }}
                        >
                          <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
                            <circle cx="50" cy="50" r="46" fill="none" stroke="#f97316" strokeOpacity="0.8" strokeWidth="1.5" />
                            {Array.from({ length: 8 }, (_, index) => (
                              <line
                                key={index}
                                x1="50"
                                y1="50"
                                x2="96"
                                y2="50"
                                stroke="#f97316"
                                strokeOpacity="0.7"
                                strokeWidth="1"
                                transform={`rotate(${index * 45} 50 50)`}
                              />
                            ))}
                          </svg>
                        </div>
                      )}
                      {hasPreviewBox && (
                        <div
                          className={`absolute z-30 overflow-visible ${isPreviewBoxDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                          aria-label={`Preview person measuring ${previewBoxWidthCm} by ${previewBoxDepthCm} centimeters`}
                          data-preview-box
                          onPointerDown={handlePreviewBoxPointerDown}
                          onPointerMove={handlePreviewBoxPointerMove}
                          onPointerUp={handlePreviewBoxPointerUp}
                          onPointerCancel={handlePreviewBoxPointerUp}
                          onMouseEnter={() => setIsPreviewBoxHovered(true)}
                          onMouseLeave={() => setIsPreviewBoxHovered(false)}
                          onClick={() => setIsPreviewBoxSelected(true)}
          style={{
            left: `${38 + clampedPreviewBoxPosition.xCm * previewScale}px`,
            top: `${38 + clampedPreviewBoxPosition.yCm * previewScale}px`,
            width: `${previewBoxWidth}px`,
            height: `${previewBoxHeight}px`,
            transform: `rotate(${previewBoxRotation}deg)`,
            transformOrigin: 'center',
            boxShadow: isPreviewBoxHovered || isPreviewBoxDragging || isPreviewBoxSelected
              ? 'inset 0 0 0 1px #f97316, 0 0 0 1px #f97316'
              : 'none',
          }}
                        >
                          <img
                            src="/preview-person.png"
                            alt="Top-down person preview"
                            draggable="false"
                            className="absolute left-1/2 top-1/2 select-none object-contain"
                            style={{
              width: `${Math.max(1, Math.round(PREVIEW_BOX_WIDTH_CM * previewScale))}px`,
              height: `${Math.max(1, Math.round(PREVIEW_BOX_DEPTH_CM * previewScale))}px`,
              transform: 'translate(-50%, -50%)',
              transformOrigin: 'center',
                            }}
                          />
                          {isPreviewBoxSelected && (
                            <button
                              type="button"
                              aria-label="Rotate person preview"
                              data-preview-box-rotate-handle
                              onPointerDown={handlePreviewBoxRotationPointerDown}
                              onPointerMove={handlePreviewBoxRotationPointerMove}
                              onPointerUp={handlePreviewBoxRotationPointerUp}
                              onPointerCancel={handlePreviewBoxRotationPointerUp}
                              className="absolute left-1/2 top-0 z-30 flex h-7 w-7 -translate-x-1/2 -translate-y-[calc(100%+8px)] items-center justify-center border-0 bg-transparent p-0 text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-grab"
                            >
                              <img
                                src="/rotation-arrow.png"
                                alt=""
                                draggable="false"
                                className="h-6 w-6 object-contain"
                              />
                            </button>
                          )}
                        </div>
                      )}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute z-10 border-8 border-solid transition-colors"
                        style={{
                          left: 38 - wallThickness,
                          top: 38 - wallThickness,
                          width: previewWidth + wallThickness * 2,
                          height: previewHeight + wallThickness * 2,
                          borderWidth: `${wallThickness}px`,
                          borderTopColor: hoveredWall === 'top' || selectedWall === 'top' ? '#f97316' : '#64748b',
                          borderRightColor: hoveredWall === 'right' || selectedWall === 'right' ? '#f97316' : '#64748b',
                          borderBottomColor: hoveredWall === 'bottom' || selectedWall === 'bottom' ? '#f97316' : '#64748b',
                          borderLeftColor: hoveredWall === 'left' || selectedWall === 'left' ? '#f97316' : '#64748b',
                        }}
                      />
                      {roomWalls.map((wall) => (
                        <button
                          key={wall.id}
                          type="button"
                          aria-label={wall.label}
                          aria-pressed={selectedWall === wall.id}
                          onPointerDown={(event) => handleWallPointerDown(event, wall)}
                          onPointerMove={handleWallPointerMove}
                          onPointerUp={handleWallPointerUp}
                          onPointerCancel={handleWallPointerUp}
                          onMouseEnter={() => setHoveredWall(wall.id)}
                          onMouseLeave={() => setHoveredWall(null)}
                          onClick={() => setSelectedWall(wall.id)}
                          data-room-wall
                          className={`absolute z-20 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${wall.id === 'top' || wall.id === 'bottom' ? 'cursor-ns-resize' : 'cursor-ew-resize'}`}
                          style={wall.style}
                        />
                      ))}
                    </div>

                    <div
                      className="absolute bottom-3 right-3 z-10 flex items-center gap-1"
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <button type="button" aria-label="Zoom out room preview" title="Zoom out" onClick={() => changePreviewZoom(-0.1)} className="h-7 w-7 border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100">−</button>
                      <button type="button" aria-label="Reset room preview view" title="Reset view" onClick={resetPreviewView} className="h-7 min-w-12 border border-slate-300 bg-white px-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100">{Math.round(previewZoom * 100)}%</button>
                      <button type="button" aria-label="Zoom in room preview" title="Zoom in" onClick={() => changePreviewZoom(0.1)} className="h-7 w-7 border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100">+</button>
                    </div>
                  </div>
                </aside>
              </div>
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

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-slate-900">Width (cm)
                    <input required type="number" min="1" max="100000" step="0.1" value={renameWidth} onChange={(event) => setRenameWidth(event.target.value)} className="room-dimension-input mt-2 min-h-11 w-full border border-slate-300 px-3 py-0 text-xs" />
                  </label>
                  <label className="text-xs font-semibold text-slate-900">Depth (cm)
                    <input required type="number" min="1" max="100000" step="0.1" value={renameDepth} onChange={(event) => setRenameDepth(event.target.value)} className="room-dimension-input mt-2 min-h-11 w-full border border-slate-300 px-3 py-0 text-xs" />
                  </label>
                </div>

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
                    disabled={busyAction === 'rename'}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={busyAction === 'rename'}>
                    {busyAction === 'rename' ? 'Saving…' : 'Save name'}
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

              {deleteRoomError && <p role="alert" className="mt-3 text-sm text-red-600">{deleteRoomError}</p>}

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setRoomToDelete(null)}
                  disabled={busyAction === 'delete'}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={confirmDeleteRoom}
                  disabled={busyAction === 'delete'}
                >
                  {busyAction === 'delete' ? 'Deleting…' : 'Delete room'}
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
