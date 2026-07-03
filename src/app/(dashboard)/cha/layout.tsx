export default function ChaLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-col gap-6 cha-module">{children}</div>;
}
