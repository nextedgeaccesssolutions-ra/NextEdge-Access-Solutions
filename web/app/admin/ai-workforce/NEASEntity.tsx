"use client";

export type NEASEntityState = "idle" | "listening" | "thinking" | "speaking" | "error";

/** Abstract humanoid AI presence for the NEAS orchestration core.
 *
 *  Drawn as one inline SVG so it scales with the orb slot and needs no assets.
 *  Every state change is expressed with transform/opacity only, so the figure
 *  animates on the compositor rather than forcing layout while someone talks.
 *  The whole figure is decorative; the surrounding <button> carries the label. */
export default function NEASEntity({ state = "idle" }: { state?: NEASEntityState }) {
  return (
    <div className={`neas-entity ${state}`} aria-hidden>
      <style jsx>{`
        .neas-entity{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
        .neas-entity :global(svg){width:100%;height:100%;overflow:visible}

        /* Whole-body life: a slow breath at rest, a sway while speaking. */
        .neas-entity :global(.ne-body){transform-origin:120px 252px;animation:ne-breathe 5.2s ease-in-out infinite}
        .neas-entity.listening :global(.ne-body){animation:ne-breathe 2.6s ease-in-out infinite}
        .neas-entity.speaking :global(.ne-body){animation:ne-sway 1.45s ease-in-out infinite}
        .neas-entity.error :global(.ne-body){animation:none}

        /* Head reacts first: tilts to listen, nods while speaking. */
        .neas-entity :global(.ne-head-group){transform-origin:120px 100px;transition:transform .4s ease}
        .neas-entity.listening :global(.ne-head-group){animation:ne-tilt 3.1s ease-in-out infinite}
        .neas-entity.speaking :global(.ne-head-group){animation:ne-nod 1.45s ease-in-out infinite}

        /* Visor is the "eye" — narrows when thinking, flares when speaking. */
        .neas-entity :global(.ne-visor){transform-box:fill-box;transform-origin:center;transition:transform .35s ease,opacity .35s ease}
        .neas-entity.thinking :global(.ne-visor){animation:ne-scan-eye 1.1s ease-in-out infinite}
        .neas-entity.listening :global(.ne-visor){transform:scaleY(1.25)}
        .neas-entity.error :global(.ne-visor){transform:scaleY(.3);opacity:.7}

        .neas-entity :global(.ne-core){transform-box:fill-box;transform-origin:center;animation:ne-core-pulse 3.4s ease-in-out infinite}
        .neas-entity.listening :global(.ne-core){animation:ne-core-pulse 1.5s ease-in-out infinite}
        .neas-entity.thinking :global(.ne-core){animation:ne-core-pulse .85s ease-in-out infinite}
        .neas-entity.speaking :global(.ne-core){animation:ne-core-pulse .6s ease-in-out infinite}

        .neas-entity :global(.ne-aura){transform-origin:120px 170px;animation:ne-aura 5.2s ease-in-out infinite}
        .neas-entity.listening :global(.ne-aura){animation:ne-aura 2.4s ease-in-out infinite}
        .neas-entity.speaking :global(.ne-aura){animation:ne-aura 1.45s ease-in-out infinite}

        .neas-entity :global(.ne-ring-outer){transform-origin:120px 178px;animation:ne-spin 46s linear infinite}
        .neas-entity :global(.ne-ring-inner){transform-origin:120px 180px;animation:ne-spin 31s linear reverse infinite}
        .neas-entity.thinking :global(.ne-ring-inner){animation-duration:7s}
        .neas-entity.thinking :global(.ne-ring-outer){animation-duration:13s}

        /* Voice bars only carry amplitude while actually speaking. */
        .neas-entity :global(.ne-bar){transform-box:fill-box;transform-origin:center;transform:scaleY(.1);transition:transform .35s ease}
        .neas-entity.listening :global(.ne-bar){transform:scaleY(.3)}
        .neas-entity.speaking :global(.ne-bar){animation:ne-voice .9s ease-in-out infinite}
        .neas-entity.speaking :global(.ne-bar-2){animation-delay:-.72s}
        .neas-entity.speaking :global(.ne-bar-3){animation-delay:-.24s}
        .neas-entity.speaking :global(.ne-bar-4){animation-delay:-.54s}
        .neas-entity.speaking :global(.ne-bar-5){animation-delay:-.12s}
        .neas-entity.speaking :global(.ne-bar-6){animation-delay:-.66s}
        .neas-entity.speaking :global(.ne-bar-7){animation-delay:-.36s}

        /* Thinking: a scan line travels the figure. */
        .neas-entity :global(.ne-scan){opacity:0}
        .neas-entity.thinking :global(.ne-scan){animation:ne-scan 1.9s linear infinite}

        .neas-entity :global(.ne-mote){animation:ne-drift 6s ease-in-out infinite}
        .neas-entity :global(.ne-mote-b){animation-duration:7.6s;animation-delay:-2.4s}
        .neas-entity :global(.ne-mote-c){animation-duration:8.8s;animation-delay:-4.1s}

        @keyframes ne-breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.012)}}
        @keyframes ne-sway{0%,100%{transform:translateY(0) rotate(-.7deg)}50%{transform:translateY(-2px) rotate(.7deg)}}
        @keyframes ne-nod{0%,100%{transform:translateY(0) rotate(-1.4deg)}50%{transform:translateY(1.5px) rotate(1.4deg)}}
        @keyframes ne-tilt{0%,100%{transform:rotate(-2.6deg)}50%{transform:rotate(2.6deg)}}
        @keyframes ne-scan-eye{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.45)}}
        @keyframes ne-core-pulse{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.14);opacity:1}}
        @keyframes ne-aura{0%,100%{transform:scale(1);opacity:.34}50%{transform:scale(1.09);opacity:.6}}
        @keyframes ne-spin{to{transform:rotate(360deg)}}
        @keyframes ne-voice{0%,100%{transform:scaleY(.18)}25%{transform:scaleY(1)}50%{transform:scaleY(.42)}75%{transform:scaleY(.78)}}
        @keyframes ne-scan{0%{opacity:0;transform:translateY(-78px)}12%{opacity:.85}88%{opacity:.85}100%{opacity:0;transform:translateY(96px)}}
        @keyframes ne-drift{0%,100%{transform:translateY(0);opacity:.25}50%{transform:translateY(-9px);opacity:.75}}

        @media(prefers-reduced-motion:reduce){
          .neas-entity :global(.ne-body),.neas-entity :global(.ne-head-group),.neas-entity :global(.ne-core),
          .neas-entity :global(.ne-aura),.neas-entity :global(.ne-ring-outer),.neas-entity :global(.ne-ring-inner),
          .neas-entity :global(.ne-bar),.neas-entity :global(.ne-scan),.neas-entity :global(.ne-mote),
          .neas-entity :global(.ne-visor){animation:none!important}
          .neas-entity.speaking :global(.ne-bar){transform:scaleY(.62)}
        }
      `}</style>

      <svg viewBox="0 0 240 340" role="presentation" focusable="false">
        <defs>
          <radialGradient id="ne-aura-g" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#f0cd89" stopOpacity=".42" />
            <stop offset="55%" stopColor="#d4a64f" stopOpacity=".14" />
            <stop offset="100%" stopColor="#d4a64f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ne-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3d79a" stopOpacity=".26" />
            <stop offset="55%" stopColor="#c99537" stopOpacity=".13" />
            <stop offset="100%" stopColor="#d4a64f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ne-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbeecb" />
            <stop offset="55%" stopColor="#e5c078" />
            <stop offset="100%" stopColor="#7d5f2c" />
          </linearGradient>
          <linearGradient id="ne-scan-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f0cd89" stopOpacity="0" />
            <stop offset="50%" stopColor="#fbeecb" stopOpacity=".95" />
            <stop offset="100%" stopColor="#f0cd89" stopOpacity="0" />
          </linearGradient>
          <clipPath id="ne-clip">
            <path d="M120 110c-16 1-32 7-40 15-7 7-10 17-8 29 3 18 10 38 16 54 5 14 10 30 18 40 4 5 10 8 14 8s10-3 14-8c8-10 13-26 18-40 6-16 13-36 16-54 2-12-1-22-8-29-8-8-24-14-40-15z" />
            <path d="M120 20c23 0 35 17 33 40-2 17-14 31-33 44-19-13-31-27-33-44-2-23 10-40 33-40z" />
          </clipPath>
        </defs>

        <ellipse className="ne-aura" cx="120" cy="170" rx="98" ry="132" fill="url(#ne-aura-g)" />

        <g className="ne-ring-outer" opacity=".32" fill="none" stroke="#d4a64f" strokeWidth="1">
          <ellipse cx="120" cy="178" rx="96" ry="124" strokeDasharray="2 14" />
        </g>
        <g className="ne-ring-inner" opacity=".4" fill="none" stroke="#b58c48" strokeWidth="1">
          <ellipse cx="120" cy="180" rx="72" ry="104" strokeDasharray="1 12" />
        </g>

        <g className="ne-body">
          {/* slender arms, held close, with a slight elbow */}
          <path d="M81 129c-8 15-10 36-8 57 1 15 4 28 8 38M159 129c8 15 10 36 8 57-1 15-4 28-8 38"
                fill="none" stroke="#c9a05a" strokeWidth="2" strokeLinecap="round" opacity=".75" />

          {/* torso — wide shoulders tapering to a narrow base, no legs */}
          <path d="M120 110c-16 1-32 7-40 15-7 7-10 17-8 29 3 18 10 38 16 54 5 14 10 30 18 40 4 5 10 8 14 8s10-3 14-8c8-10 13-26 18-40 6-16 13-36 16-54 2-12-1-22-8-29-8-8-24-14-40-15z"
                fill="url(#ne-skin)" stroke="url(#ne-edge)" strokeWidth="1.7" strokeLinejoin="round" />

          {/* faceted plating */}
          <path d="M80 128c13 8 27 12 40 12s27-4 40-12" fill="none" stroke="#e5c078" strokeWidth="1.3" strokeLinecap="round" opacity=".55" />
          <path d="M120 142v102" fill="none" stroke="#e5c078" strokeWidth="1" opacity=".26" />
          <path d="M92 182h56M100 210h40M108 234h24" fill="none" stroke="#e5c078" strokeWidth="1" strokeLinecap="round" opacity=".3" />
          <circle cx="81" cy="129" r="3.4" fill="#f0cd89" opacity=".85" />
          <circle cx="159" cy="129" r="3.4" fill="#f0cd89" opacity=".85" />

          {/* chest core */}
          <g className="ne-core">
            <circle cx="120" cy="160" r="16" fill="#f0cd89" opacity=".12" />
            <circle cx="120" cy="160" r="9" fill="none" stroke="#fbeecb" strokeWidth="1.4" />
            <circle cx="120" cy="160" r="3.4" fill="#fbeecb" />
          </g>

          {/* neck */}
          <path d="M112 100v14M128 100v14" stroke="#c9a05a" strokeWidth="1.8" strokeLinecap="round" opacity=".9" />

          <g className="ne-head-group">
            {/* elongated cranium, pointed chin */}
            <path d="M120 20c23 0 35 17 33 40-2 17-14 31-33 44-19-13-31-27-33-44-2-23 10-40 33-40z"
                  fill="url(#ne-skin)" stroke="url(#ne-edge)" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M120 22v13M100 38c13-6 27-6 40 0M104 74l16 13 16-13" fill="none" stroke="#fbeecb" strokeWidth="1.1" strokeLinecap="round" opacity=".42" />

            {/* swept visor */}
            <g className="ne-visor">
              <path d="M99 59c6-6 36-6 42 0-4 8-12 12-21 12s-17-4-21-12z" fill="#fbeecb" opacity=".92" />
              <path d="M100 55c7-7 33-7 40 0" fill="none" stroke="#fff8e8" strokeWidth="1.1" />
            </g>

            {/* speech aperture — the amplitude read sits on the face, not the chest */}
            <g className="ne-voice" stroke="#f7e3b5" strokeWidth="2.6" strokeLinecap="round">
              <line className="ne-bar ne-bar-1" x1="109" y1="80" x2="109" y2="90" />
              <line className="ne-bar ne-bar-2" x1="114.5" y1="78" x2="114.5" y2="92" />
              <line className="ne-bar ne-bar-4" x1="120" y1="76" x2="120" y2="94" />
              <line className="ne-bar ne-bar-6" x1="125.5" y1="78" x2="125.5" y2="92" />
              <line className="ne-bar ne-bar-7" x1="131" y1="80" x2="131" y2="90" />
            </g>
          </g>

          {/* thinking scan sweep, clipped to the silhouette */}
          <g clipPath="url(#ne-clip)">
            <rect className="ne-scan" x="40" y="140" width="160" height="3" fill="url(#ne-scan-g)" />
          </g>
        </g>

        {/* dissolve into motes at the base */}
        <g fill="#f0cd89">
          <circle className="ne-mote" cx="100" cy="268" r="1.9" />
          <circle className="ne-mote-b" cx="120" cy="282" r="1.5" />
          <circle className="ne-mote-c" cx="142" cy="266" r="2" />
          <circle className="ne-mote-b" cx="86" cy="250" r="1.3" />
          <circle className="ne-mote-c" cx="156" cy="248" r="1.4" />
          <circle className="ne-mote" cx="130" cy="296" r="1.1" />
        </g>
      </svg>
    </div>
  );
}
