import { PremiumDoctorCalendar } from './calendar';
import { useTranslation } from 'react-i18next';

interface DoctorCalendarSectionProps {
  doctorId?: string;
  practiceId?: string;
}

const DoctorCalendarSection = ({ doctorId, practiceId }: DoctorCalendarSectionProps) => {
  return <PremiumDoctorCalendar doctorId={doctorId} practiceId={practiceId} />;
};

export default DoctorCalendarSection;
