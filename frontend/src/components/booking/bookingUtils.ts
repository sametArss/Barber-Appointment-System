import type { AvailableSlot, WorkingHourResponse } from '@/types/booking';

export type GridSlotItem =
  | { kind: 'available'; startLabel: string; endLabel: string; slot: AvailableSlot }
  | { kind: 'break'; startLabel: string; endLabel: string }
  | { kind: 'busy'; startLabel: string; endLabel: string };

export interface DateOption {
  value: string;
  dayName: string;
  dayNum: string;
  month: string;
}

export const BOOKING_STEPS = [
  { id: 1, title: 'Hizmet Seçimi' },
  { id: 2, title: 'Berber Seçimi' },
  { id: 3, title: 'Tarih & Saat' },
  { id: 4, title: 'Özet & Onay' },
] as const;

export const toMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const formatMinutes = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (totalMinutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const getNext14Days = (): DateOption[] => {
  const days: DateOption[] = [];
  const base = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push({
      value: `${yyyy}-${mm}-${dd}`,
      dayName:
        i === 0
          ? 'Bugün'
          : i === 1
            ? 'Yarın'
            : d.toLocaleDateString('tr-TR', { weekday: 'short' }),
      dayNum: dd,
      month: d.toLocaleDateString('tr-TR', { month: 'short' }),
    });
  }
  return days;
};

export const formatReadableDate = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });
};

export const buildSlotGrid = (
  dateStr: string,
  durationMinutes: number,
  availableSlots: AvailableSlot[],
  workingHours: WorkingHourResponse[],
): { isClosedDay: boolean; items: GridSlotItem[] } => {
  const availableMap = new Map<string, AvailableSlot>();
  availableSlots.forEach((slot) => {
    availableMap.set(slot.startTime.slice(0, 5), slot);
  });

  const dayOfWeek = new Date(`${dateStr}T00:00:00`).getDay();
  const dayConfig = workingHours.find((w) => w.dayOfWeek === dayOfWeek);

  if (!dayConfig && workingHours.length > 0 && availableSlots.length === 0) {
    return { isClosedDay: true, items: [] };
  }

  if (!dayConfig) {
    return {
      isClosedDay: false,
      items: availableSlots.map((slot) => ({
        kind: 'available',
        startLabel: slot.startTime.slice(0, 5),
        endLabel: slot.endTime.slice(0, 5),
        slot,
      })),
    };
  }

  const startMin = toMinutes(dayConfig.startTime);
  const endMin = toMinutes(dayConfig.endTime);
  const breaks = dayConfig.breaks.map((b) => ({
    start: toMinutes(b.startTime),
    end: toMinutes(b.endTime),
  }));

  const items: GridSlotItem[] = [];
  for (let cursor = startMin; cursor + durationMinutes <= endMin; cursor += 15) {
    const slotEnd = cursor + durationMinutes;
    const startLabel = formatMinutes(cursor);
    const endLabel = formatMinutes(slotEnd);

    const matched = availableMap.get(startLabel);
    if (matched) {
      items.push({ kind: 'available', startLabel, endLabel, slot: matched });
      continue;
    }

    const overlapsBreak = breaks.some((b) => cursor < b.end && slotEnd > b.start);
    if (overlapsBreak) {
      items.push({ kind: 'break', startLabel, endLabel });
    } else {
      items.push({ kind: 'busy', startLabel, endLabel });
    }
  }

  return { isClosedDay: false, items };
};
