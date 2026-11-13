import { useEffect, useRef, useState } from "react";
import { CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import { ROLES, moodSummary, roleOf } from "@aihot/site/roles";
import { IconChevronDown, IconClose } from "../../components/icons";
import { dismissRoleHint, setRoleKey, useRoleHintDismissed, useRoleKey } from "../../lib/local-state";

/**
 * 「按岗位」的选择器：一个 chip 加一个小菜单。选中的岗位存在浏览器本地，只影响同一天内部的先后，
 * 不影响任何公开出口。
 */
export function RolePick({ onPicked }: { onPicked?: () => void }) {
  const key = useRoleKey();
  const role = roleOf(key);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (next: string | null) => {
    setRoleKey(next);
    setOpen(false);
    onPicked?.();
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex h-11 items-center gap-1 rounded-full border px-3.5 text-[13px] transition-colors lg:h-8 lg:text-[12.5px] ${
          role ? "border-accent bg-accent-soft text-accent-ink" : "border-line-strong bg-surface text-ink-2 hover:border-ink-4 hover:text-ink"
        }`}
      >
        {role ? `按${role.label}排` : "按岗位"}
        <IconChevronDown size={13} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-[19rem] rounded-panel border border-line-strong bg-surface p-1.5 shadow-lg">
          <p className="px-2.5 pb-1.5 pt-1 text-[11.5px] leading-4 text-ink-4">选一次，以后头版按这个岗位排；随时可以换回来。</p>
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="menuitemradio"
              aria-checked={r.key === role?.key}
              onClick={() => pick(r.key)}
              className={`block w-full rounded-tile px-2.5 py-1.5 text-left transition-colors hover:bg-bg-muted ${
                r.key === role?.key ? "bg-accent-soft" : ""
              }`}
            >
              <span className={`block text-[13px] ${r.key === role?.key ? "font-medium text-accent-ink" : "text-ink"}`}>{r.label}</span>
              <span className="block text-[11.5px] leading-4 text-ink-4">{r.oneline}</span>
            </button>
          ))}
          {role && (
            <button
              type="button"
              role="menuitem"
              onClick={() => pick(null)}
              className="mt-1 block w-full rounded-tile border-t border-line-soft px-2.5 py-1.5 text-left text-[12.5px] text-ink-3 transition-colors hover:bg-bg-muted hover:text-ink"
            >
              不按岗位，回到时间顺序
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** 选中岗位后的一行说明：哪些类别被提前、哪些被沉底。不解释就会变成「顺序怎么变了」。 */
export function RoleNote() {
  const role = roleOf(useRoleKey());
  if (!role) return null;
  const { up, down } = moodSummary(role, CATEGORY_LABELS);
  return (
    <p className="mb-2 text-[11.5px] leading-4 text-ink-4">
      {up.length > 0 && <>提前：{up.join("、")}</>}
      {up.length > 0 && down.length > 0 && " · "}
      {down.length > 0 && <>沉底：{down.join("、")}</>}
      {up.length > 0 || down.length > 0 ? "；同一天里只换先后，内容一条不少。" : "同一天里只换先后，内容一条不少。"}
    </p>
  );
}

/** 第一次来时的一条横条：不打断阅读，关掉就不再出现。 */
export function RoleHint() {
  const dismissed = useRoleHintDismissed();
  const key = useRoleKey();
  const [open, setOpen] = useState(false);
  if (dismissed || key) return null;
  return (
    <div className="mb-3 rounded-card border border-line-strong bg-surface px-3.5 py-2.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink">你主要看哪一块？</p>
          <p className="mt-0.5 text-[12px] leading-5 text-ink-3">选一次，以后头版按你的岗位排——同一天里只换先后，内容一条不少。选择只存在这台设备上。</p>
          {open ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRoleKey(r.key)}
                  className="h-8 rounded-full border border-line-strong px-3 text-[12.5px] text-ink-2 transition-colors hover:border-accent hover:text-accent-ink"
                >
                  {r.label}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setOpen(true)} className="mt-1.5 text-[12.5px] font-medium text-accent-ink hover:underline">
              选一个岗位
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismissRoleHint}
          aria-label="不再提示"
          className="shrink-0 rounded-full p-1 text-ink-4 transition-colors hover:bg-bg-muted hover:text-ink-2"
        >
          <IconClose size={14} />
        </button>
      </div>
    </div>
  );
}
