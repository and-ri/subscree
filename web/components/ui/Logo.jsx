// Nook brand mark — dark rounded square with a white "N".
// Mirrors app/icon.svg so the favicon and in-app logo stay in sync.
export function Logo({ className }) {
    return (
        <svg
            viewBox="0 0 512 512"
            className={className}
            role="img"
            aria-label="Nook"
        >
            <rect width="512" height="512" rx="72" fill="#222222" />
            <g fill="#ffffff">
                <rect x="150" y="112" width="34" height="288" />
                <rect x="328" y="112" width="34" height="288" />
                <polygon points="150,112 184,112 362,400 328,400" />
            </g>
        </svg>
    );
}
