// src/utils/TimeSlotCalculator.ts
import { format } from 'date-fns';

export interface TimeSlot {
  time: string;
  status: 'available' | 'booked' | 'break' | 'outside-hours';
  color: 'green' | 'gray' | 'red' | 'disabled';
  endTime?: string;
}

export interface DoctorSchedule {
  workingHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  breaks: Array<{
    start: string; // "12:00"
    end: string;   // "13:00"
  }>;
  daysOff: number[]; // [0, 6] for Sunday and Saturday
}

export interface BookedAppointment {
  date: string; // "2024-01-25"
  startTime: string; // "10:00"
  endTime: string;   // "10:30"
}

export class TimeSlotCalculator {
  private defaultSchedule: DoctorSchedule = {
    workingHours: {
      start: "09:00",
      end: "17:00"
    },
    breaks: [
      {
        start: "12:00",
        end: "13:00"
      }
    ],
    daysOff: [0, 6]
  };

  generateTimeSlots(
    date: Date,
    procedureDurationMinutes: number,
    schedule: DoctorSchedule = this.defaultSchedule,
    bookedAppointments: BookedAppointment[] = []
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const dateString = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    if (schedule.daysOff.includes(dayOfWeek)) return slots;

    const startTime = this.timeStringToMinutes(schedule.workingHours.start);
    const endTime = this.timeStringToMinutes(schedule.workingHours.end);
    const slotInterval = 15;

    for (let minutes = startTime; minutes < endTime; minutes += slotInterval) {
      const slotTime = this.minutesToTimeString(minutes);
      const slotEndTime = this.minutesToTimeString(minutes + procedureDurationMinutes);

      if (minutes + procedureDurationMinutes > endTime) break;

      const status = this.getSlotStatus(
        dateString,
        slotTime,
        procedureDurationMinutes,
        schedule,
        bookedAppointments
      );

      slots.push({
        time: slotTime,
        endTime: slotEndTime,
        status,
        color: this.getSlotColor(status),
      });
    }

    return slots;
  }

  private getSlotStatus(
    date: string,
    startTime: string,
    durationMinutes: number,
    schedule: DoctorSchedule,
    bookedAppointments: BookedAppointment[]
  ): TimeSlot['status'] {
    const startMinutes = this.timeStringToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;

    for (const breakTime of schedule.breaks) {
      const breakStart = this.timeStringToMinutes(breakTime.start);
      const breakEnd = this.timeStringToMinutes(breakTime.end);

      if (this.timesOverlap(startMinutes, endMinutes, breakStart, breakEnd)) return 'break';
    }

    for (const appointment of bookedAppointments) {
      if (appointment.date === date) {
        const appointmentStart = this.timeStringToMinutes(appointment.startTime);
        const appointmentEnd = this.timeStringToMinutes(appointment.endTime);

        if (this.timesOverlap(startMinutes, endMinutes, appointmentStart, appointmentEnd)) return 'booked';
      }
    }

    return 'available';
  }

  private getSlotColor(status: TimeSlot['status']): TimeSlot['color'] {
    switch (status) {
      case 'available':
        return 'green';
      case 'booked':
        return 'gray';
      case 'break':
        return 'red';
      case 'outside-hours':
        return 'disabled';
      default:
        return 'gray';
    }
  }

  private timesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && end1 > start2;
  }

  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  findNextAvailableDay(
    startDate: Date,
    procedureDurationMinutes: number,
    schedule: DoctorSchedule = this.defaultSchedule,
    bookedAppointments: BookedAppointment[] = [],
    maxDaysToSearch: number = 30
  ): Date | null {
    let currentDate = new Date(startDate);

    for (let i = 0; i < maxDaysToSearch; i++) {
      const slots = this.generateTimeSlots(currentDate, procedureDurationMinutes, schedule, bookedAppointments);
      if (slots.some((slot) => slot.status === 'available')) return currentDate;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return null;
  }

  hasAvailableSlots(
    date: Date,
    procedureDurationMinutes: number,
    schedule: DoctorSchedule = this.defaultSchedule,
    bookedAppointments: BookedAppointment[] = []
  ): boolean {
    const slots = this.generateTimeSlots(date, procedureDurationMinutes, schedule, bookedAppointments);
    return slots.some((slot) => slot.status === 'available');
  }

  /**
   * Deprecated: mock booked appointments were removed.
   * Pass real appointments into generateTimeSlots / findNextAvailableDay instead.
   */
  getMockBookedAppointments(): BookedAppointment[] {
    return [];
  }
}
