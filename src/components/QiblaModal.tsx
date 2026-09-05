import React, { useState, useEffect } from 'react';
import { Compass, X, MapPin, Navigation } from 'lucide-react';
import { calculateQiblaBearing, DEFAULT_COORDS, type Coordinates } from '@/utils/prayerTimes';
import { motion, AnimatePresence } from 'framer-motion';

interface QiblaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QiblaModal: React.FC<QiblaModalProps> = ({ isOpen, onClose }) => {
  const [, setCoords] = useState<Coordinates>(DEFAULT_COORDS);
  const [heading, setHeading] = useState<number>(0);
  const [qiblaBearing, setQiblaBearing] = useState<number>(() => calculateQiblaBearing(DEFAULT_COORDS));
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [locationName, setLocationName] = useState<string>('القاهرة، مصر');

  // Detect GPS Location
  useEffect(() => {
    if (!isOpen) return;
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLoc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setCoords(userLoc);
          setQiblaBearing(calculateQiblaBearing(userLoc));
          setLocationName(`${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`);
        },
        () => {
          // keep default
        }
      );
    }
  }, [isOpen]);

  // Device orientation listener
  useEffect(() => {
    if (!isOpen) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let compassHeading: number | null = null;
      // iOS webkitCompassHeading
      if ('webkitCompassHeading' in e && typeof (e as { webkitCompassHeading?: number }).webkitCompassHeading === 'number') {
        compassHeading = (e as { webkitCompassHeading: number }).webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Standard Android / Chrome (alpha 0 is North if absolute)
        compassHeading = 360 - e.alpha;
      }

      if (compassHeading !== null) {
        setHeading(Math.round(compassHeading));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isOpen]);

  const requestCompassPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        setPermissionGranted(response === 'granted');
      } catch {
        setPermissionGranted(false);
      }
    } else {
      setPermissionGranted(true);
    }
  };

  // Difference between current heading and Qibla bearing
  // When needle points up, user is facing Qibla
  const relativeAngle = (qiblaBearing - heading + 360) % 360;
  const isAligned = Math.abs(relativeAngle) < 5 || Math.abs(relativeAngle - 360) < 5;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-sm rounded-3xl p-6 glass-card border border-accent-mint/30 bg-primary-surface/95 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Background ambient glow */}
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-all ${isAligned ? 'bg-accent-mint/30' : 'bg-accent-gold/15'}`} />

            <div className="w-full flex items-center justify-between pb-3 border-b border-border-subtle/50 mb-4">
              <div className="flex items-center gap-2 text-accent-mint font-bold text-sm">
                <Compass className="w-5 h-5" />
                <span>بوصلة القبلة</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-4">
              <MapPin className="w-3.5 h-3.5 text-accent-emerald" />
              <span>{locationName}</span>
              <span className="mx-1">•</span>
              <span className="text-accent-gold font-mono font-bold">زاوية القبلة: {qiblaBearing}°</span>
            </div>

            {/* Compass Dial */}
            <div className="relative w-64 h-64 my-2 flex items-center justify-center">
              {/* Outer compass ring */}
              <div
                className={`w-full h-full rounded-full border-4 transition-colors duration-500 flex items-center justify-center relative shadow-inner ${
                  isAligned ? 'border-accent-mint shadow-accent-mint/30' : 'border-border-subtle shadow-black/40'
                }`}
                style={{
                  transform: `rotate(${-heading}deg)`,
                  transition: 'transform 0.1s ease-out',
                }}
              >
                {/* Cardinal directions */}
                <span className="absolute top-2 font-bold text-xs text-red-500">N</span>
                <span className="absolute bottom-2 font-bold text-xs text-text-muted">S</span>
                <span className="absolute right-2 font-bold text-xs text-text-muted">E</span>
                <span className="absolute left-2 font-bold text-xs text-text-muted">W</span>

                {/* Degree ticks */}
                <div className="w-48 h-48 rounded-full border border-dashed border-border-subtle/40" />

                {/* Kaaba Marker on the ring */}
                <div
                  className="absolute w-8 h-8 -top-4 flex items-center justify-center"
                  style={{
                    transformOrigin: '50% 144px',
                    transform: `rotate(${qiblaBearing}deg)`,
                  }}
                >
                  <div className="w-7 h-7 rounded-lg bg-accent-gold border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold text-primary-bg">
                    🕋
                  </div>
                </div>
              </div>

              {/* Center Needle / Indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-1.5 h-32 rounded-full flex flex-col justify-between items-center transition-transform"
                  style={{
                    transform: `rotate(${relativeAngle}deg)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                >
                  <Navigation
                    className={`w-8 h-8 -mt-2 fill-current ${
                      isAligned ? 'text-accent-mint animate-bounce' : 'text-accent-gold'
                    }`}
                  />
                  <div className="w-2 h-2 rounded-full bg-border-subtle" />
                </div>
                <div className="w-6 h-6 rounded-full bg-primary-card border-2 border-accent-mint z-10" />
              </div>
            </div>

            {/* Alignment indicator */}
            <div className="mt-4 w-full">
              {isAligned ? (
                <div className="py-2 px-4 rounded-xl bg-accent-mint/20 border border-accent-mint text-accent-mint font-bold text-sm animate-pulse">
                  ✓ أنت تتجه نحو الكعبة المشرفة الآن
                </div>
              ) : (
                <div className="py-2 px-4 rounded-xl bg-primary-surface/80 border border-border-subtle text-text-secondary text-xs">
                  أدر جهازك حتى يتطابق المؤشر مع القبلة ({qiblaBearing}°)
                </div>
              )}
            </div>

            {/* iOS permission trigger if needed */}
            {permissionGranted === false && (
              <button
                onClick={requestCompassPermission}
                className="mt-3 text-xs text-accent-mint underline font-medium"
              >
                تفعيل مستشعر البوصلة
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
