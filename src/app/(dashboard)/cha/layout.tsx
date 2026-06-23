export default function ChaLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-col gap-8 cha-module">{children}</div>;
}
