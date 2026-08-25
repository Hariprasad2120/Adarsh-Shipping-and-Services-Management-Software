import packageJson from "../../../package.json";

export const developmentBuildWatermarkVariants = [
  "glass-chip",
  "signal-bar",
  "stacked-card",
] as const;

export type DevelopmentBuildWatermarkVariant =
  (typeof developmentBuildWatermarkVariants)[number];

export interface DevelopmentBuildWatermarkProps {
  buildLabel?: string;
  className?: string;
  title?: string;
  variant?: DevelopmentBuildWatermarkVariant;
  versionLabel?: string;
}

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function getDevelopmentBuildMetadata() {
  return {
    buildLabel: process.env.NEXT_PUBLIC_BUILD_NUMBER ?? "local",
    versionLabel: process.env.NEXT_PUBLIC_APP_VERSION ?? packageJson.version,
  };
}

export function DevelopmentBuildWatermark({
  buildLabel,
  className,
  title = "This build is under development",
  variant = "glass-chip",
  versionLabel,
}: DevelopmentBuildWatermarkProps) {
  const metadata = getDevelopmentBuildMetadata();
  const resolvedVersion = versionLabel ?? metadata.versionLabel;
  const resolvedBuild = buildLabel ?? metadata.buildLabel;

  return (
    <section
      className={joinClassNames(
        "mnx-build-watermark",
        `mnx-build-watermark--${variant}`,
        className,
      )}
      aria-label={`${title}. Version ${resolvedVersion}. Build ${resolvedBuild}.`}
      role="status"
    >
      <div className="mnx-build-watermark-copy">
        <p>{title}</p>
        <div className="mnx-build-watermark-meta">
          <span>Version {resolvedVersion}</span>
          <span>Build {resolvedBuild}</span>
        </div>
      </div>
    </section>
  );
}
