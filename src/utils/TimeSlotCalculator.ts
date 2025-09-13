import { format, addMinutes, parseISO, isSameDay, isAfter, isBefore } from 'date-fns';

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
    daysOff: [0, 6] // Sunday and Saturday
  };

  /**
   * Generate time slots for a specific date and procedure duration
   */
  generateTimeSlots(
    date: Date,
    procedureDurationMinutes: number,
    schedule: DoctorSchedule = this.defaultSchedule,
    bookedAppointments: BookedAppointment[] = []
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const dateString = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    // Check if it's a day off
    if (schedule.daysOff.includes(dayOfWeek)) {
      return slots; // Return empty array for days off
    }

    // Generate slots from start to end time
    const startTime = this.timeStringToMinutes(schedule.workingHours.start);
    const endTime = this.timeStringToMinutes(schedule.workingHours.end);
    const slotInterval = 15; // 15-minute intervals

    for (let minutes = startTime; minutes < endTime; minutes += slotInterval) {
      const slotTime = this.minutesToTimeString(minutes);
      const slotEndTime = this.minutesToTimeString(minutes + procedureDurationMinutes);
      
      // Check if procedure would end after working hours
      if (minutes + procedureDurationMinutes > endTime) {
        break;
      }

      const slot: TimeSlot = {
        time: slotTime,
        endTime: slotEndTime,
        status: this.getSlotStatus(
          dateString,
          slotTime,
          procedureDurationMinutes,
          schedule,
          bookedAppointments
        ),
        color: 'green' // Will be set based on status
      };

      // Set color based on status
      slot.color = this.getSlotColor(slot.status);
      slots.push(slot);
    }

    return slots;
  }

  /**
   * Get the status of a specific time slot
   */
  private getSlotStatus(
    date: string,
    startTime: string,
    durationMinutes: number,
    schedule: DoctorSchedule,
    bookedAppointments: BookedAppointment[]
  ): TimeSlot['status'] {
    const startMinutes = this.timeStringToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;

    // Check if slot overlaps with break time
    for (const breakTime of schedule.breaks) {
      const breakStart = this.timeStringToMinutes(breakTime.start);
      const breakEnd = this.timeStringToMinutes(breakTime.end);
      
      if (this.timesOverlap(startMinutes, endMinutes, breakStart, breakEnd)) {
        return 'break';
      }
    }

    // Check if slot conflicts with existing appointments
    for (const appointment of bookedAppointments) {
      if (appointment.date === date) {
        const appointmentStart = this.timeStringToMinutes(appointment.startTime);
        const appointmentEnd = this.timeStringToMinutes(appointment.endTime);
        
        if (this.timesOverlap(startMinutes, endMinutes, appointmentStart, appointmentEnd)) {
          return 'booked';
        }
      }
    }

    return 'available';
  }

  /**
   * Get color for slot status
   */
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

  /**
   * Check if two time ranges overlap
   */
  private timesOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes since midnight to time string
   */
  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Find next available day with slots
   */
  findNextAvailableDay(
    startDate: Date,
    procedureDurationMinutes: number,
    schedule: DoctorSchedule = this.defaultSchedule,
    bookedAppointments: BookedAppointment[] = [],
    maxDaysToSearch: number = 30
  ): Date | null {
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < maxDaysToSearch; i++) {
      const slots = this.generateTimeSlots(
        currentDate,
        procedureDurationMinutes,
        schedule,
        bookedAppointments
      );
      
      const availableSlots = slots.filter(slot => slot.status === 'available');
      
      if (availableSlots.length > 0) {
        return currentDate;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return null; // No available days found
  }

  /**
   * Check if a specific day has any available slots
   */
  hasAvailableSlots(
    date: Date,
    procedureDurationMinutes: number,
    schedule: DoctorSchedule = this.defaultSchedule,
    bookedAppointments: BookedAppointment[] = []
  ): boolean {
    const slots = this.generateTimeSlots(date, procedureDurationMinutes, schedule, bookedAppointments);
    return slots.some(slot => slot.status === 'available');
  }

  /**
   * Get mock booked appointments for demo purposes
   */
  getMockBookedAppointments(): BookedAppointment[] {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return [
      {
        date: format(today, 'yyyy-MM-dd'),
        startTime: "10:00",
        endTime: "10:30"
      },
      {
        date: format(today, 'yyyy-MM-dd'),
        startTime: "14:00",
        endTime: "15:00"
      },
      {
        date: format(tomorrow, 'yyyy-MM-dd'),
        startTime: "09:00",
        endTime: "09:30"
      },
      {
        date: format(tomorrow, 'yyyy-MM-dd'),
        startTime: "15:30",
        endTime: "16:30"
      }
    ];
  }
}