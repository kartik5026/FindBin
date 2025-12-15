import { useEffect, useMemo, useState } from 'react'
import { MapPicker } from './MapPicker'

type LatLng = { lat: number; lng: number }

export function MapPickerModal(props: {
  open: boolean
  initial: LatLng
  value: LatLng
  onClose: () => void
  onConfirm: (value: LatLng) => void
}) {
  const [draft, setDraft] = useState<LatLng>(props.value)

  useEffect(() => {
    if (!props.open) return
    setDraft(props.value)
  }, [props.open, props.value.lat, props.value.lng])

  useEffect(() => {
    if (!props.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props.open, props.onClose])

  const pretty = useMemo(() => {
    return `${draft.lat.toFixed(6)}, ${draft.lng.toFixed(6)}`
  }, [draft.lat, draft.lng])

  if (!props.open) return null

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modalContent">
        <div className="modalHeader">
          <div>
            <div className="modalTitle">Pick dustbin location</div>
            <div className="modalSub">Click the map to place the marker. Current: {pretty}</div>
          </div>
          <div className="row">
            <button className="smallBtn ghostBtn" onClick={props.onClose}>
              Cancel
            </button>
            <button
              className="smallBtn"
              onClick={() => {
                props.onConfirm(draft)
                props.onClose()
              }}
            >
              Use this location
            </button>
          </div>
        </div>

        <div className="modalBody">
          <MapPicker
            value={draft}
            initialCenter={props.initial}
            zoom={17}
            height={Math.max(420, Math.floor(window.innerHeight * 0.75))}
            onChange={(next) => setDraft(next)}
          />
          <div className="modalHint muted">
            Tip: Zoom in to see smaller street names. Press Esc to close.
          </div>
        </div>
      </div>
      <div className="modalBackdrop" onClick={props.onClose} />
    </div>
  )
}


