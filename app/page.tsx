import { SystemStatus } from '@/components/features/system-status'

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <h1>Stackbox</h1>
      <SystemStatus />
    </div>
  );
}
