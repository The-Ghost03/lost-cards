import { useRef, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function SelfieCapture({ onCapture, preview }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [phase, setPhase] = useState('idle') // idle | streaming | captured

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  useEffect(() => () => stopStream(), [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setPhase('streaming')
    } catch {
      toast.error("Impossible d'accéder à la caméra. Vérifiez les autorisations.")
    }
  }

  const capture = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    stopStream()
    canvas.toBlob(blob => {
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
      onCapture(file, URL.createObjectURL(blob))
      setPhase('captured')
    }, 'image/jpeg', 0.92)
  }

  const retake = () => {
    setPhase('idle')
    startCamera()
  }

  return (
    <div className="flex flex-col gap-3">
      <canvas ref={canvasRef} className="hidden" />

      {/* Video stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={phase === 'streaming' ? 'w-full rounded-2xl bg-black object-cover' : 'hidden'}
      />

      {/* Captured preview */}
      {phase === 'captured' && preview && (
        <img
          src={preview}
          alt="Votre selfie"
          className="w-36 h-36 object-cover rounded-full border-4 border-orange-400 mx-auto shadow"
        />
      )}

      {/* CTA buttons */}
      {phase === 'idle' && (
        <button
          type="button"
          onClick={startCamera}
          className="w-full py-3 px-4 rounded-xl border-2 border-orange-400 text-orange-700 font-semibold text-sm bg-orange-50 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">🤳</span> Activer la caméra
        </button>
      )}

      {phase === 'streaming' && (
        <button
          type="button"
          onClick={capture}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          📸 Prendre la photo
        </button>
      )}

      {phase === 'captured' && (
        <button
          type="button"
          onClick={retake}
          className="w-full py-2 px-4 rounded-xl border border-orange-300 text-orange-600 text-sm hover:bg-orange-50 transition-colors"
        >
          🔄 Reprendre la photo
        </button>
      )}
    </div>
  )
}
