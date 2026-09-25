import React, { useId } from 'react';

export default function ArchitecturalPattern({ className = '' }) {
  const gradientId = `afrah-line-${useId().replace(/:/g,'')}`;
  return <svg className={`architectural-pattern ${className}`} viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c5a48f" stopOpacity=".04"/><stop offset=".55" stopColor="#c5a48f" stopOpacity=".65"/><stop offset="1" stopColor="#c5a48f" stopOpacity=".06"/></linearGradient></defs>
    {[0,1,2].map(row => <g key={row} transform={`translate(0 ${row * 480 - 220})`}>
      {[0,1,2].map(col => <g key={col} style={{ '--pattern-delay': `${(row + col) * -.8}s` }} transform={`translate(${col * 720 - 360} 0)`}>
        <path style={{stroke:`url(#${gradientId})`}} d="M0 0 C0 225 320 200 360 480 C400 200 720 225 720 0 M360 0 V480"/>
        <path className="pattern-trace" d="M0 0 C0 225 320 200 360 480 C400 200 720 225 720 0" pathLength="1"/>
      </g>)}
    </g>)}
  </svg>;
}
