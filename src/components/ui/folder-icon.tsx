import React from "react";

export const FolderIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement> & { size?: number | string }
>(({ size = 16, className, ...props }, ref) => {
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* Folder Outline */}
      <path d="M11.17,6l3.42,3.41.58.59H28V26H4V6h7.17m0-2H4A2,2,0,0,0,2,6V26a2,2,0,0,0,2,2H28a2,2,0,0,0,2-2V10a2,2,0,0,0-2-2H16L12.59,4.59A2,2,0,0,0,11.17,4Z" />
      {/* Internal lines with rounded endcaps */}
      <rect x="8" y="14" width="8" height="2" rx="1" />
      <rect x="8" y="19" width="12" height="2" rx="1" />
    </svg>
  );
});

FolderIcon.displayName = "FolderIcon";
export default FolderIcon;
