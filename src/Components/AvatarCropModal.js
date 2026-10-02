import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';

async function getCroppedBlob(imageSrc, croppedAreaPixels) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}

function AvatarCropModal({ imageSrc, onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setArea(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!area) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, area);
      onConfirm(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="crop-modal-backdrop">
      <div className="crop-modal">
        <h3>Adjust Photo</h3>
        <div className="crop-stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
        <div className="crop-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Use Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarCropModal;
