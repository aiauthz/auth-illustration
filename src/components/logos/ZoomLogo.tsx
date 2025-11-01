interface ZoomLogoProps {
  className?: string
}

/**
 * Zoom logo in monochrome style
 */
export function ZoomLogo({ className }: ZoomLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 7C2 5.34315 3.34315 4 5 4H14C15.6569 4 17 5.34315 17 7V10.5858L20.2929 7.29289C20.9229 6.66294 22 7.10948 22 8V16C22 16.8905 20.9229 17.3371 20.2929 16.7071L17 13.4142V17C17 18.6569 15.6569 20 14 20H5C3.34315 20 2 18.6569 2 17V7ZM15 7C15 6.44772 14.5523 6 14 6H5C4.44772 6 4 6.44772 4 7V17C4 17.5523 4.44772 18 5 18H14C14.5523 18 15 17.5523 15 17V7Z"
        fill="currentColor"
      />
    </svg>
  )
}
