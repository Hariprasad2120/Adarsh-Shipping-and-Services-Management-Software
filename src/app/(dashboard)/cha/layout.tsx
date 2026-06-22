export default function ChaLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 cha-module">{children}</div>;
}
