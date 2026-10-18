import React, { useRef, useEffect } from 'react';
import type { MarsSkySnapshot } from '../../core/sky/mars24';

interface Star {
  name: string;
  ra: number;
  dec: number;
  mag: number;
  constellation: string;
}

interface MarsSkyCanvasProps {
  sky: MarsSkySnapshot;
  stars?: Star[];
  tau?: number; // dust opacity, default 0.5
  className?: string;
}

const DEG_TO_RAD = Math.PI / 180;

export const MarsSkyCanvas: React.FC<MarsSkyCanvasProps> = ({
  sky,
  stars = [],
  tau = 0.5,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const sunElev = sky.sunElevationDeg;
      const sunAz = sky.sunAzimuthDeg;

      ctx.clearRect(0, 0, width, height);

      // 1. Sky Background Gradient
      let skyGradient: CanvasGradient;

      if (sunElev > 10) {
        // Full daylight: butterscotch/tawny martian sky
        // Modulated by dust optical depth (tau)
        const dustFactor = Math.min(1.5, Math.max(0.5, tau));
        const rTop = Math.floor(185 * dustFactor);
        const gTop = Math.floor(125 * dustFactor);
        const bTop = Math.floor(80 * dustFactor);
        const rHoriz = Math.floor(215 * dustFactor);
        const gHoriz = Math.floor(160 * dustFactor);
        const bHoriz = Math.floor(115 * dustFactor);

        skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.75);
        skyGradient.addColorStop(0, `rgb(${rTop}, ${gTop}, ${bTop})`);
        skyGradient.addColorStop(1, `rgb(${rHoriz}, ${gHoriz}, ${bHoriz})`);
      } else if (sunElev > -6) {
        // Twilight / Sunrise / Sunset:
        // Blue scattering near sun, warm dusty red-orange elsewhere
        skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.75);
        skyGradient.addColorStop(0, '#1c1514');
        skyGradient.addColorStop(0.5, '#4a3028');
        skyGradient.addColorStop(1, '#8c5035');
      } else {
        // Night sky: deep charcoal to black
        skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.75);
        skyGradient.addColorStop(0, '#05070a');
        skyGradient.addColorStop(0.7, '#0b0f14');
        skyGradient.addColorStop(1, '#151a22');
      }

      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height * 0.75);

      // 2. Stars at night / twilight
      if (sunElev < 5 && stars.length > 0) {
        const starOpacity = sunElev < -5 ? 1.0 : (5 - sunElev) / 10;
        ctx.save();
        for (const star of stars) {
          // Approximate mapping of RA/Dec to panoramic dome
          // For visualization, distribute across canvas hemisphere
          const x = ((star.ra / 360) * width + width * (sky.ltstHours / 24)) % width;
          const elev = 90 - Math.abs(star.dec - 18); // centered near Mars equator
          if (elev > 0) {
            const y = (1 - elev / 90) * (height * 0.7);
            const radius = Math.max(0.75, (2.8 - star.mag * 0.5));
            ctx.fillStyle = `rgba(255, 255, 255, ${starOpacity * (star.mag < 1.0 ? 1 : 0.75)})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Label prominent 1st magnitude navigation stars
            if (star.mag < 0.5 && starOpacity > 0.8) {
              ctx.font = '9px "IBM Plex Mono", monospace';
              ctx.fillStyle = 'rgba(200, 225, 255, 0.6)';
              ctx.fillText(star.name, x + 5, y + 3);
            }
          }
        }
        ctx.restore();
      }

      // 3. Sun Position & Twilight Blue Scattering
      // Map sun azimuth (0-360) and elevation (-90 to +90) to canvas
      const sunX = (sunAz / 360) * width;
      const sunY = (1 - Math.max(0, sunElev) / 90) * (height * 0.7);

      if (sunElev > -12) {
        ctx.save();
        // Blue scattering halo around Sun (Mars sunrise/sunset characteristic)
        if (sunElev < 15) {
          const haloRadius = Math.max(30, 100 - sunElev * 4);
          const blueGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, haloRadius);
          blueGlow.addColorStop(0, 'rgba(110, 180, 240, 0.85)');
          blueGlow.addColorStop(0.3, 'rgba(70, 140, 210, 0.45)');
          blueGlow.addColorStop(0.7, 'rgba(45, 90, 160, 0.15)');
          blueGlow.addColorStop(1, 'rgba(40, 80, 140, 0)');

          ctx.fillStyle = blueGlow;
          ctx.beginPath();
          ctx.arc(sunX, sunY, haloRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Sun disk
        if (sunElev > 0) {
          // Angular diameter is ~21 arcmin (0.35 deg)
          const sunRadius = 9;
          const sunDiscGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, sunRadius);
          sunDiscGrad.addColorStop(0, '#ffffff');
          sunDiscGrad.addColorStop(0.7, '#fff3e0');
          sunDiscGrad.addColorStop(1, '#ffcc80');

          ctx.fillStyle = sunDiscGrad;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = '10px "IBM Plex Mono", monospace';
          ctx.fillStyle = '#ffecb3';
          ctx.fillText(`Sol Sun (${sky.sunElevationDeg.toFixed(0)}°)`, sunX + 14, sunY + 4);
        }
        ctx.restore();
      }

      // 4. Phobos & Deimos Moons
      if (sky.phobos.isAboveHorizon) {
        const phobosX = (sky.phobos.azimuthDeg / 360) * width;
        const phobosY = (1 - Math.max(0, sky.phobos.elevationDeg) / 90) * (height * 0.7);

        ctx.save();
        // Phobos is potato-shaped and fast
        ctx.fillStyle = '#d7ccc8';
        ctx.beginPath();
        ctx.ellipse(phobosX, phobosY, 5, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText(`Phobos (W→E)`, phobosX + 8, phobosY + 3);
        ctx.restore();
      }

      if (sky.deimos.isAboveHorizon) {
        const deimosX = (sky.deimos.azimuthDeg / 360) * width;
        const deimosY = (1 - Math.max(0, sky.deimos.elevationDeg) / 90) * (height * 0.7);

        ctx.save();
        ctx.fillStyle = '#cfd8dc';
        ctx.beginPath();
        ctx.arc(deimosX, deimosY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.fillStyle = '#b0bec5';
        ctx.fillText(`Deimos (E→W)`, deimosX + 6, deimosY + 3);
        ctx.restore();
      }

      // 5. Earth (Morning / Evening Star)
      if (sky.earth.isAboveHorizon && sunElev < 20) {
        const earthX = (sky.earth.azimuthDeg / 360) * width;
        const earthY = (1 - Math.max(0, sky.earth.elevationDeg) / 90) * (height * 0.7);

        ctx.save();
        // Earth glow
        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.arc(earthX, earthY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.fillStyle = '#81d4fa';
        ctx.fillText(`Earth (${sky.earth.elongationDeg}° elg)`, earthX + 7, earthY + 3);
        ctx.restore();
      }

      // 6. Terrain Horizon Ground (Martian rust-red dunes & rocky hills)
      const groundY = height * 0.75;
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
      groundGrad.addColorStop(0, '#7c381c');
      groundGrad.addColorStop(0.3, '#5c2814');
      groundGrad.addColorStop(1, '#2c1209');

      ctx.fillStyle = groundGrad;
      ctx.beginPath();
      ctx.moveTo(0, groundY);

      // Undulating silhouette of martian crater rim / hills
      for (let x = 0; x <= width; x += 10) {
        const hillOffset = Math.sin(x * 0.015) * 6 + Math.sin(x * 0.04) * 3;
        ctx.lineTo(x, groundY + hillOffset);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // 7. Cardinal Direction Markers along Horizon
      const cardinals = [
        { label: 'N', az: 0 },
        { label: 'NE', az: 45 },
        { label: 'E', az: 90 },
        { label: 'SE', az: 135 },
        { label: 'S', az: 180 },
        { label: 'SW', az: 225 },
        { label: 'W', az: 270 },
        { label: 'NW', az: 315 },
        { label: 'N', az: 360 }
      ];

      ctx.save();
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      for (const card of cardinals) {
        const cx = (card.az / 360) * width;
        ctx.strokeStyle = 'rgba(255, 176, 112, 0.4)';
        ctx.beginPath();
        ctx.moveTo(cx, groundY - 6);
        ctx.lineTo(cx, groundY + 4);
        ctx.stroke();

        ctx.fillStyle = '#ffb070';
        ctx.fillText(card.label, cx, groundY + 16);
      }
      ctx.restore();
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [sky, stars, tau]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-mars-border bg-black ${className}`}>
      <canvas
        ref={canvasRef}
        width={800}
        height={320}
        className="w-full h-auto block"
        aria-label="Interactive 2D Martian Sky View"
      />
    </div>
  );
};
