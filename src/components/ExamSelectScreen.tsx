import { EXAMS } from '../exams';
import { useApp } from '../context/AppContext';
import ExamCard from './ExamCard';
import OverallStatsCard from './OverallStatsCard';

export default function ExamSelectScreen() {
  const { selectExam } = useApp();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Exams</h2>
        <span className="text-sm text-muted-foreground">{EXAMS.length} available</span>
      </div>

      <OverallStatsCard />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXAMS.map(exam => (
          <ExamCard key={exam.id} exam={exam} onClick={() => selectExam(exam)} />
        ))}
      </div>
    </div>
  );
}
