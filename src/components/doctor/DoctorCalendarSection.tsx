import { PremiumDoctorCalendar } from './calendar';

interface DoctorCalendarSectionProps {
  doctorId?: string;
  practiceId?: string;
}

const DoctorCalendarSection = ({ doctorId, practiceId }: DoctorCalendarSectionProps) => {
  return <PremiumDoctorCalendar doctorId={doctorId} practiceId={practiceId} />;
};

export default DoctorCalendarSection;
