import { useState, useRef } from 'react';

export default function ImageUploader({ onUpload, uploading = false }) {
  const [dragging,  setDragging]  = useState(false);
  const [preview,   setPreview]   = useState(null);
  const [file,      setFile]      = useState(null);
  const [imageType, setImageType] = useState('mammogram');
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleClear = () => {
    setFile(null); setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const types = [
    { key: 'mammogram',  label: 'Mammogram',  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg> },
    { key: 'ultrasound', label: 'Ultrasound', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  ];

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="grid grid-cols-2 gap-2">
        {types.map(({ key, label, icon }) => (
          <button key={key} type="button" onClick={() => setImageType(key)}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
              imageType === key
                ? 'border-rose-500 bg-rose-50 text-rose-600'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className={imageType === key ? 'text-rose-500' : 'text-gray-400'}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Drop zone / preview */}
      {!preview ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-rose-400 bg-rose-50 scale-[1.01]'
              : 'border-gray-200 bg-gray-50 hover:border-rose-300 hover:bg-rose-50/40'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-rose-100' : 'bg-white border border-gray-200'}`}>
              <svg className={`w-6 h-6 transition-colors ${dragging ? 'text-rose-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-gray-700 font-semibold text-sm">
                {dragging ? 'Drop to upload' : 'Drop image here or click to browse'}
              </p>
              <p className="text-gray-400 text-xs mt-1">PNG, JPG, JPEG · Max 10MB</p>
            </div>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200">
          <img src={preview} alt="Preview" className="w-full max-h-56 object-contain" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button type="button" onClick={handleClear}
            className="absolute top-2.5 right-2.5 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xs transition-all">
            ✕
          </button>
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            <span className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-medium capitalize">
              {imageType}
            </span>
            <span className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
              {file?.name?.length > 20 ? file.name.slice(0, 20) + '…' : file?.name}
            </span>
          </div>
        </div>
      )}

      {/* Upload button */}
      {file && (
        <button type="button" onClick={() => onUpload(file, imageType)} disabled={uploading}
          className="btn-primary w-full py-3 shadow-glow-rose">
          {uploading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading...</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>Upload {imageType}</>
          )}
        </button>
      )}
    </div>
  );
}
