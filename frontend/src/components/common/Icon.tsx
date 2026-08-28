import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

type IconMap = Record<string, React.ComponentType<LucideProps>>;

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const map = Lucide as unknown as IconMap;
  const Cmp = map[name] ?? Lucide.Circle;
  return <Cmp {...props} />;
}
