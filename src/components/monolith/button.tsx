import Link from "next/link";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

const buttonStyles = cva("mnx-action", {
  variants: {
    variant: {
      default: "mnx-action--primary",
      primary: "mnx-action--primary",
      accent: "mnx-action--accent",
      secondary: "mnx-action--secondary",
      inverse: "mnx-action--secondary",
      outline: "mnx-action--outline",
      destructive: "mnx-action--destructive",
    },
    size: {
      sm: "mnx-action--small",
      md: "mnx-action--medium",
      lg: "mnx-action--medium",
    },
    mode: {
      default: "",
      icon: "mnx-action--icon-only",
    },
    fullWidth: {
      true: "mnx-action--full",
      false: "",
    },
  },
  defaultVariants: {
    variant: "secondary",
    size: "md",
    fullWidth: false,
  },
});

const textActionStyles = cva("mnx-text-action", {
  variants: {
    tone: {
      accent: "mnx-text-action--accent",
      subtle: "mnx-text-action--subtle",
    },
  },
  defaultVariants: {
    tone: "accent",
  },
});

const iconActionStyles = cva("mnx-icon-action", {
  variants: {
    tone: {
      neutral: "mnx-icon-action--neutral",
      solid: "mnx-icon-action--solid",
      destructive: "mnx-icon-action--destructive",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

type ButtonVisualProps = VariantProps<typeof buttonStyles> & {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
};

function ActionContent({
  children,
  leadingIcon,
  trailingIcon,
  loading,
  loadingLabel,
}: ButtonVisualProps & {
  children: React.ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <>
      {loading ? (
        <span className="mnx-action__spinner" aria-hidden="true" />
      ) : leadingIcon ? (
        <span className="mnx-action__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}

      <span className="mnx-action__label">
        {loading ? loadingLabel ?? "Please wait" : children}
      </span>

      {!loading && trailingIcon ? (
        <span className="mnx-action__icon" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </>
  );
}

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "style"
> &
  ButtonVisualProps & {
    children: React.ReactNode;
    loading?: boolean;
    loadingLabel?: string;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant,
      size,
      mode,
      fullWidth,
      leadingIcon,
      trailingIcon,
      loading = false,
      loadingLabel,
      className: _className,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant ?? "secondary"}
      data-loading={loading || undefined}
      className={buttonStyles({ variant, size, mode, fullWidth })}
    >
      <ActionContent
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        loading={loading}
        loadingLabel={loadingLabel}
      >
        {children}
      </ActionContent>
    </button>
  ),
);

Button.displayName = "Button";

export type ButtonLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "children" | "style"
> &
  ButtonVisualProps & {
    children: React.ReactNode;
  };

export function ButtonLink({
  children,
  variant,
  size,
  mode,
  fullWidth,
  leadingIcon,
  trailingIcon,
  className: _className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={buttonStyles({ variant, size, mode, fullWidth })}
      data-variant={variant ?? "secondary"}
    >
      <ActionContent
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
      >
        {children}
      </ActionContent>
    </Link>
  );
}

type TextActionVisualProps = VariantProps<typeof textActionStyles> & {
  trailingIcon?: React.ReactNode;
};

export type TextActionLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "children" | "style"
> &
  TextActionVisualProps & {
    children: React.ReactNode;
  };

export function TextActionLink({
  children,
  tone,
  trailingIcon,
  className: _className,
  ...props
}: TextActionLinkProps) {
  return (
    <Link {...props} className={textActionStyles({ tone })}>
      <span>{children}</span>
      {trailingIcon ? (
        <span className="mnx-text-action__icon" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </Link>
  );
}

export type TextActionButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "style"
> &
  TextActionVisualProps & {
    children: React.ReactNode;
  };

export function TextActionButton({
  children,
  tone,
  trailingIcon,
  className: _className,
  type = "button",
  ...props
}: TextActionButtonProps) {
  return (
    <button {...props} type={type} className={textActionStyles({ tone })}>
      <span>{children}</span>
      {trailingIcon ? (
        <span className="mnx-text-action__icon" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </button>
  );
}

type IconToneProps = VariantProps<typeof iconActionStyles>;

export type IconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "style" | "aria-label"
> &
  IconToneProps & {
    icon: React.ReactNode;
    "aria-label": string;
  };

export function IconButton({
  icon,
  tone,
  className: _className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={iconActionStyles({ tone })}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

export type IconLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "children" | "style" | "aria-label"
> &
  IconToneProps & {
    icon: React.ReactNode;
    "aria-label": string;
  };

export function IconLink({ icon, tone, className: _className, ...props }: IconLinkProps) {
  return (
    <Link {...props} className={iconActionStyles({ tone })}>
      <span aria-hidden="true">{icon}</span>
    </Link>
  );
}
