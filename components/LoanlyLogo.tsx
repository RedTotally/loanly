export default function LoanlyLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 775 224.99"
      className={className}
      aria-label="Loanly"
    >
      <polygon
        fill="#52525b"
        points="112.79 112.79 112.79 0 0 0 0 224.99 112.79 224.99 225.58 224.99 225.58 112.79 112.79 112.79"
      />
      <rect fill="#52525b" x="140.99" y="27.61" width="56.39" height="56.39" />
      <text
        fill="#52525b"
        transform="translate(313 169.07)"
        style={{
          fontFamily: 'var(--font-google-sans-flex), "Google Sans Flex", sans-serif',
          fontSize: "128.33px",
          fontWeight: 900,
        }}
      >
        <tspan x="0" y="0">
          Loanly
        </tspan>
      </text>
    </svg>
  );
}
