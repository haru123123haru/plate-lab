import { TabBar } from "@/components/tab-bar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <main className="pb-[88px]">{children}</main>
      <TabBar />
    </div>
  );
}
