import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { CheckIcon, ClockIcon } from '@heroicons/react/24/solid';

interface Assignment {
  id: string;
  title: string;
  maxScore: number;
  dueDate?: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  score?: number;
  status: string;
  submittedAt?: string;
  feedback?: string;
  content?: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  submissions?: Submission[];
  enrolledAt: string;
  progress: number;
}

interface Course {
  id: string;
  title: string;
  _count?: {
    enrollments: number;
    assignments: number;
  };
}

const GradebookPage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  // Reserved for future inline editing feature
  // const [editingCell, setEditingCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  // const [tempScore, setTempScore] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'avg'>('name');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'GRADED' | 'NOT_SUBMITTED'>('ALL');
  const [viewingSubmission, setViewingSubmission] = useState<{
    submission: Submission | null;
    student: Student;
    assignment: Assignment;
  } | null>(null);
  const [gradingForm, setGradingForm] = useState({ score: '', feedback: '' });

  useEffect(() => {
    fetchCourses();
  }, [user]);

  useEffect(() => {
    if (selectedCourse) {
      fetchGradebookData();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      if (!user) return;
      const response = await api.get(`/courses/teacher/${user.id}`);
      const coursesData = response.data.data;
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id);
      }
    } catch (error: any) {
      toast.error('Помилка завантаження курсів');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGradebookData = async () => {
    try {
      setLoading(true);
      
      // Fetch assignments
      const assignmentsRes = await api.get(`/assignments/course/${selectedCourse}`);
      setAssignments(assignmentsRes.data.data);

      // Fetch students with submissions
      const enrollmentsRes = await api.get(`/enrollments/course/${selectedCourse}`);
      setStudents(enrollmentsRes.data.data.map((e: any) => ({
        ...e.user,
        enrolledAt: e.enrolledAt,
        progress: e.progress,
      })));
    } catch (error: any) {
      toast.error('Помилка завантаження даних');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getSubmission = (studentId: string, assignmentId: string): Submission | undefined => {
    const student = students.find(s => s.id === studentId);
    return student?.submissions?.find(sub => sub.assignmentId === assignmentId);
  };

  const handleCellClick = (studentId: string, assignmentId: string, e: React.MouseEvent) => {
    // Don't open modal if clicking on input
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    
    const submission = getSubmission(studentId, assignmentId);
    const student = students.find(s => s.id === studentId);
    const assignment = assignments.find(a => a.id === assignmentId);
    
    if (!student || !assignment) return;
    
    setViewingSubmission({
      submission: submission || null,
      student,
      assignment,
    });
    
    setGradingForm({
      score: submission?.score?.toString() || '',
      feedback: submission?.feedback || '',
    });
  };

  // Reserved for future quick score editing feature
  // const handleQuickScoreClick = (studentId: string, assignmentId: string, e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   const submission = getSubmission(studentId, assignmentId);
  //   setEditingCell({ studentId, assignmentId });
  //   setTempScore(submission?.score?.toString() || '');
  // };

  // Reserved for future inline editing feature
  // const handleScoreSave = async () => {
  //   if (!editingCell) return;
  //   const submission = getSubmission(editingCell.studentId, editingCell.assignmentId);
  //   const assignment = assignments.find(a => a.id === editingCell.assignmentId);
  //   if (!assignment) return;
  //   const score = parseFloat(gradeForm.score);
  //   if (isNaN(score) || score < 0 || score > assignment.maxScore) {
  //     toast.error(`Оцінка повинна бути від 0 до ${assignment.maxScore}`);
  //     return;
  //   }
  //   try {
  //     if (submission) {
  //       await api.put(`/submissions/${submission.id}/grade`, {
  //         score,
  //         feedback: submission.feedback || '',
  //       });
  //     } else {
  //       toast.error('Студент ще не здав завдання');
  //       setEditingCell(null);
  //       return;
  //     }
  //     toast.success('Оцінку збережено!');
  //     setEditingCell(null);
  //     fetchGradebookData();
  //   } catch (error: any) {
  //     toast.error(error.response?.data?.message || 'Помилка збереження оцінки');
  //   }
  // };

  const handleGradeSubmitFromModal = async () => {
    if (!viewingSubmission?.submission) {
      toast.error('Студент ще не здав завдання');
      return;
    }

    const score = parseFloat(gradingForm.score);
    if (isNaN(score) || score < 0 || score > viewingSubmission.assignment.maxScore) {
      toast.error(`Оцінка повинна бути від 0 до ${viewingSubmission.assignment.maxScore}`);
      return;
    }

    try {
      await api.put(`/submissions/${viewingSubmission.submission.id}/grade`, {
        score,
        feedback: gradingForm.feedback,
      });

      toast.success('Оцінку виставлено!');
      setViewingSubmission(null);
      setGradingForm({ score: '', feedback: '' });
      fetchGradebookData(); // Reload data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка збереження оцінки');
    }
  };

  const calculateStudentAverage = (studentId: string): number => {
    const student = students.find(s => s.id === studentId);
    if (!student?.submissions || student.submissions.length === 0) return 0;

    const gradedSubmissions = student.submissions.filter(s => s.status === 'GRADED' && s.score !== undefined);
    if (gradedSubmissions.length === 0) return 0;

    const total = gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
    return total / gradedSubmissions.length;
  };

  const calculateAssignmentAverage = (assignmentId: string): number => {
    const scores: number[] = [];
    students.forEach(student => {
      const submission = getSubmission(student.id, assignmentId);
      if (submission?.status === 'GRADED' && submission.score !== undefined) {
        scores.push(submission.score);
      }
    });

    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const getAssignmentStats = (assignmentId: string) => {
    let pending = 0;
    let graded = 0;
    let notSubmitted = 0;

    students.forEach(student => {
      const submission = getSubmission(student.id, assignmentId);
      if (!submission) {
        notSubmitted++;
      } else if (submission.status === 'GRADED') {
        graded++;
      } else if (submission.status === 'PENDING') {
        pending++;
      }
    });

    return { submitted: graded + pending, pending, graded, notSubmitted };
  };

  const getScoreColor = (score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-emerald-800 bg-emerald-500/18 dark:text-green-400 dark:bg-green-500/20';
    if (percentage >= 75) return 'text-sky-800 bg-sky-500/18 dark:text-blue-400 dark:bg-blue-500/20';
    if (percentage >= 60) return 'text-amber-800 bg-amber-500/18 dark:text-yellow-400 dark:bg-yellow-500/20';
    return 'text-orange-800 bg-orange-500/18 dark:text-orange-400 dark:bg-orange-500/20';
  };

  // Sort students
  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === 'name') {
      return a.lastName.localeCompare(b.lastName);
    } else if (sortBy === 'progress') {
      return b.progress - a.progress;
    } else if (sortBy === 'avg') {
      return calculateStudentAverage(b.id) - calculateStudentAverage(a.id);
    }
    return 0;
  });

  const exportToCSV = () => {
    const course = courses.find(c => c.id === selectedCourse);
    if (!course) return;

    // CSV Header
    let csv = 'Прізвище,Ім\'я,Email,';
    csv += assignments.map(a => a.title).join(',');
    csv += ',Середній бал,Прогрес\n';

    // Data rows
    sortedStudents.forEach(student => {
      csv += `${student.lastName},${student.firstName},${student.email},`;
      
      assignments.forEach(assignment => {
        const submission = getSubmission(student.id, assignment.id);
        csv += submission?.score !== undefined ? submission.score : '-';
        csv += ',';
      });

      csv += `${calculateStudentAverage(student.id).toFixed(1)},`;
      csv += `${student.progress}%\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `journal_${course.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Журнал експортовано!');
  };

  if (loading && courses.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8 dash-fg">Електронний журнал</h1>
        <div className="text-center dash-muted">Завантаження...</div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8 dash-fg">Електронний журнал</h1>
        <div className="glass p-12 rounded-2xl text-center dash-bordered">
          <p className="dash-muted">Немає доступних курсів</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="dash-page-title-accent mb-2">
            Електронний журнал
          </h1>
          <p className="dash-muted">Оцінки та прогрес студентів</p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl font-medium transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Експорт CSV
        </button>
      </div>

      {/* Controls */}
      <div className="glass p-6 rounded-2xl dash-bordered">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="gb-course" className="block text-sm font-medium dash-muted mb-2">Курс</label>
            <select
              id="gb-course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="dash-control"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} ({course._count?.enrollments || 0} студентів)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="gb-task-filter" className="block text-sm font-medium dash-muted mb-2">Фільтр завдань</label>
            <select
              id="gb-task-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="dash-control"
            >
              <option value="ALL">Всі завдання</option>
              <option value="PENDING">Тільки на перевірці</option>
              <option value="GRADED">Тільки перевірені</option>
              <option value="NOT_SUBMITTED">Тільки не здані</option>
            </select>
          </div>

          <div>
            <label htmlFor="gb-sort" className="block text-sm font-medium dash-muted mb-2">Сортування</label>
            <select
              id="gb-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="dash-control"
            >
              <option value="name">За прізвищем</option>
              <option value="avg">За середнім балом</option>
              <option value="progress">За прогресом</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-xl dash-bordered">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/15 dark:bg-blue-500/20 rounded-lg">
              <svg className="w-6 h-6 text-blue-700 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold dash-fg">{students.length}</p>
              <p className="text-xs dash-muted-weak">Студентів</p>
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded-xl dash-bordered">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/15 dark:bg-purple-500/20 rounded-lg">
              <svg className="w-6 h-6 text-primary-700 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold dash-fg">{assignments.length}</p>
              <p className="text-xs dash-muted-weak">Завдань</p>
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded-xl dash-bordered">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/15 dark:bg-green-500/20 rounded-lg">
              <svg className="w-6 h-6 text-emerald-700 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold dash-fg">
                {students.reduce((sum, s) => {
                  const subs = s.submissions?.filter(sub => sub.status === 'GRADED') || [];
                  return sum + subs.length;
                }, 0)}
              </p>
              <p className="text-xs dash-muted-weak">Перевірено</p>
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded-xl dash-bordered">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/15 dark:bg-yellow-500/20 rounded-lg">
              <svg className="w-6 h-6 text-amber-700 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold dash-fg">
                {students.reduce((sum, s) => {
                  const subs = s.submissions?.filter(sub => sub.status === 'PENDING') || [];
                  return sum + subs.length;
                }, 0)}
              </p>
              <p className="text-xs dash-muted-weak">На перевірці</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gradebook Table */}
      {loading ? (
        <div className="glass p-12 rounded-2xl text-center dash-bordered">
          <div className="dash-muted">Завантаження...</div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center dash-bordered">
          <svg className="w-20 h-20 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold dash-fg mb-2">Завдань ще немає</h3>
          <p className="dash-muted">Створіть завдання для цього курсу</p>
        </div>
      ) : (
        <div className="glass rounded-2xl dash-bordered overflow-x-auto">
          <table className="w-full">
            <thead className="dash-table-head sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium dash-muted uppercase tracking-wider sticky left-0 dash-table-head-sticky z-20">
                  Студент
                </th>
                {assignments.map((assignment) => {
                  const stats = getAssignmentStats(assignment.id);
                  return (
                    <th
                      key={assignment.id}
                      className="px-3 py-3 text-center text-xs font-medium dash-muted uppercase tracking-wider min-w-[140px]"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="line-clamp-2 font-semibold dash-fg">{assignment.title}</span>
                        <span className="text-primary-700 dark:text-purple-400 font-bold text-sm">Макс: {assignment.maxScore}</span>
                        {assignment.dueDate && (
                          <span className="text-[10px] dash-muted-weak">
                            До: {new Date(assignment.dueDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {/* Stats */}
                        <div className="flex gap-2 text-[10px] mt-1">
                          <span
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-500/15 text-emerald-800 dark:bg-green-500/20 dark:text-green-400 rounded"
                            title="Перевірено"
                          >
                            <CheckIcon className="w-3 h-3 shrink-0" aria-hidden />
                            {stats.graded}
                          </span>
                          <span
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-500/15 text-amber-800 dark:bg-yellow-500/20 dark:text-yellow-400 rounded"
                            title="На перевірці"
                          >
                            <ClockIcon className="w-3 h-3 shrink-0" aria-hidden />
                            {stats.pending}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-200/80 text-slate-600 dark:bg-slate-600/30 dark:text-slate-400 rounded" title="Не здано">
                            — {stats.notSubmitted}
                          </span>
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-center text-xs font-medium dash-muted uppercase tracking-wider sticky right-0 dash-table-head-sticky z-20">
                  Середній<br/>бал
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium dash-muted uppercase tracking-wider sticky right-0 dash-table-head-sticky z-20">
                  Прогрес
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dash-divide">
              {sortedStudents.map((student) => {
                const avg = calculateStudentAverage(student.id);
                
                return (
                  <tr key={student.id} className="dash-table-row">
                    <td className="px-4 py-3 sticky left-0 dash-table-cell-sticky z-10">
                      <div className="flex items-center gap-2">
                        {student.avatar ? (
                          <img src={student.avatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-500 dark:from-purple-600 dark:to-pink-600 flex items-center justify-center text-white text-xs font-bold">
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium dash-fg truncate">
                            {student.lastName} {student.firstName}
                          </p>
                          <p className="text-xs dash-muted-weak truncate">{student.email}</p>
                        </div>
                      </div>
                    </td>

                    {assignments.map((assignment) => {
                      const submission = getSubmission(student.id, assignment.id);
                      // const isEditing = editingCell?.studentId === student.id && editingCell?.assignmentId === assignment.id;

                      return (
                        <td
                          key={assignment.id}
                          className="px-3 py-3 text-center cursor-pointer hover:bg-primary-500/8 dark:hover:bg-purple-500/10 transition"
                          onClick={(e) => handleCellClick(student.id, assignment.id, e)}
                        >
                          <div className="relative group">
                            {submission?.score !== undefined && submission?.score !== null ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-block px-3 py-1.5 rounded-lg font-bold text-sm ${getScoreColor(submission.score, assignment.maxScore)}`}>
                                  {submission.score}
                                </span>
                                <span className="text-[10px] dash-muted-weak">
                                  {((submission.score / assignment.maxScore) * 100).toFixed(0)}%
                                </span>
                              </div>
                            ) : submission?.status === 'PENDING' ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-8 h-8 rounded-full bg-amber-500/15 dark:bg-yellow-500/20 flex items-center justify-center">
                                  <svg className="w-5 h-5 text-amber-700 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <span className="text-[10px] text-amber-800 dark:text-yellow-400 font-medium">Перевірити</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-slate-400 text-xl">—</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-600">Не здано</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/10 dark:group-hover:bg-purple-500/10 rounded-lg transition"></div>
                          </div>
                        </td>
                      );
                    })}

                    <td className="px-4 py-3 text-center sticky right-0 dash-table-cell-sticky z-[5]">
                      <span className={`text-lg font-bold ${
                        avg >= 90 ? 'text-emerald-700 dark:text-green-400' :
                        avg >= 75 ? 'text-sky-700 dark:text-blue-400' :
                        avg >= 60 ? 'text-amber-700 dark:text-yellow-400' :
                        avg > 0 ? 'text-orange-700 dark:text-orange-400' :
                        'text-slate-500'
                      }`}>
                        {avg > 0 ? avg.toFixed(1) : '—'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center sticky right-0 dash-table-cell-sticky z-[5]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              student.progress === 100 ? 'bg-emerald-600 dark:bg-gradient-to-r dark:from-green-500 dark:to-emerald-500' :
                              student.progress >= 50 ? 'bg-sky-600 dark:bg-gradient-to-r dark:from-blue-500 dark:to-cyan-500' :
                              'bg-primary-600 dark:bg-gradient-to-r dark:from-purple-500 dark:to-pink-500'
                            }`}
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-primary-700 dark:text-purple-400 min-w-[40px]">
                          {student.progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Average row */}
              <tr className="bg-primary-500/[0.06] dark:bg-purple-900/20 font-bold">
                <td className="px-4 py-3 sticky left-0 bg-primary-100/90 dark:bg-purple-900/40 backdrop-blur-sm z-[5]">
                  <span className="text-primary-800 dark:text-purple-400">Середнє по завданню</span>
                </td>
                {assignments.map((assignment) => {
                  const avg = calculateAssignmentAverage(assignment.id);
                  return (
                    <td key={assignment.id} className="px-3 py-3 text-center">
                      <span className={`text-sm ${avg > 0 ? 'text-primary-800 dark:text-purple-400' : 'text-slate-500'}`}>
                        {avg > 0 ? avg.toFixed(1) : '—'}
                      </span>
                    </td>
                  );
                })}
                <td className="px-4 py-3 sticky right-0 bg-primary-100/90 dark:bg-purple-900/40 backdrop-blur-sm z-[5]"></td>
                <td className="px-4 py-3 sticky right-0 bg-primary-100/90 dark:bg-purple-900/40 backdrop-blur-sm z-[5]"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="glass p-4 rounded-xl dash-bordered">
        <p className="text-sm font-medium dash-muted mb-3">Легенда:</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-emerald-500/18 text-emerald-800 dark:bg-green-500/20 dark:text-green-400 font-bold">90+</span>
            <span className="dash-muted">Відмінно</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-sky-500/18 text-sky-800 dark:bg-blue-500/20 dark:text-blue-400 font-bold">75-89</span>
            <span className="dash-muted">Добре</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-amber-500/18 text-amber-800 dark:bg-yellow-500/20 dark:text-yellow-400 font-bold">60-74</span>
            <span className="dash-muted">Задовільно</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-orange-500/18 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 font-bold">&lt;60</span>
            <span className="dash-muted">Потребує покращення</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-amber-700 dark:text-yellow-400 shrink-0" aria-hidden />
            <span className="dash-muted">На перевірці</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">—</span>
            <span className="dash-muted">Не здано</span>
          </div>
        </div>
        <p className="text-xs dash-muted-weak mt-3">Клікніть на клітинку, щоб переглянути деталі та виставити оцінку.</p>
      </div>

      {/* Submission View Modal */}
      {viewingSubmission && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewingSubmission(null)}
        >
          <div
            className="glass max-w-4xl w-full rounded-2xl border border-purple-500/30 p-8 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold dash-fg">
                {viewingSubmission.submission ? 'Перегляд завдання' : 'Завдання не здано'}
              </h2>
              <button
                type="button"
                onClick={() => setViewingSubmission(null)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                aria-label="Закрити"
              >
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Student Info */}
              <div className="glass p-4 rounded-xl border border-sky-500/25 dark:border-blue-500/30 bg-sky-500/[0.06] dark:bg-blue-500/10">
                <div className="flex items-center gap-3">
                  {viewingSubmission.student.avatar ? (
                    <img src={viewingSubmission.student.avatar} alt="" className="w-14 h-14 rounded-full" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-600 to-primary-500 dark:from-purple-600 dark:to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                      {viewingSubmission.student.firstName[0]}{viewingSubmission.student.lastName[0]}
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-semibold dash-fg">
                      {viewingSubmission.student.firstName} {viewingSubmission.student.lastName}
                    </h4>
                    <p className="text-sm dash-muted">{viewingSubmission.student.email}</p>
                  </div>
                </div>
              </div>

              {/* Assignment Info */}
              <div className="glass p-4 rounded-xl dash-bordered">
                <h3 className="text-lg font-semibold dash-fg mb-3">{viewingSubmission.assignment.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="dash-muted-weak">Максимальна оцінка</p>
                    <p className="text-primary-800 dark:text-purple-400 font-bold text-lg">{viewingSubmission.assignment.maxScore} балів</p>
                  </div>
                  {viewingSubmission.assignment.dueDate && (
                    <div>
                      <p className="dash-muted-weak">Кінцевий термін</p>
                      <p className="text-slate-800 dark:text-slate-300">{new Date(viewingSubmission.assignment.dueDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}
                </div>
              </div>

              {viewingSubmission.submission ? (
                <>
                  {/* Submission Status & Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-4 rounded-xl dash-bordered">
                      <p className="dash-muted text-sm mb-2">Статус</p>
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                          viewingSubmission.submission.status === 'GRADED'
                            ? 'bg-emerald-500/15 text-emerald-800 dark:bg-green-500/20 dark:text-green-400'
                            : 'bg-amber-500/15 text-amber-800 dark:bg-yellow-500/20 dark:text-yellow-400'
                        }`}
                      >
                        {viewingSubmission.submission.status === 'GRADED' ? (
                          <>
                            <CheckIcon className="w-4 h-4 shrink-0" aria-hidden />
                            Перевірено
                          </>
                        ) : (
                          <>
                            <ClockIcon className="w-4 h-4 shrink-0" aria-hidden />
                            На перевірці
                          </>
                        )}
                      </span>
                    </div>
                    <div className="glass p-4 rounded-xl dash-bordered">
                      <p className="dash-muted text-sm mb-2">Здано</p>
                      <p className="dash-fg-soft font-medium">
                        {viewingSubmission.submission.submittedAt 
                          ? new Date(viewingSubmission.submission.submittedAt).toLocaleString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Student's Work */}
                  {viewingSubmission.submission.content && (
                    <div>
                      <label className="block text-sm font-medium dash-muted mb-2">Робота студента</label>
                      <div className="glass p-5 rounded-xl dash-bordered max-h-60 overflow-y-auto">
                        <p className="dash-fg-soft whitespace-pre-wrap leading-relaxed">{viewingSubmission.submission.content}</p>
                      </div>
                    </div>
                  )}

                  {/* Grading Form */}
                  <div className="p-6 bg-primary-500/[0.06] dark:bg-purple-900/20 rounded-xl border border-primary-500/25 dark:border-purple-500/30">
                    <h4 className="text-lg font-semibold dash-fg mb-4">Оцінювання</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium dash-muted mb-2">
                          Оцінка (0 - {viewingSubmission.assignment.maxScore}) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={viewingSubmission.assignment.maxScore}
                          step="0.1"
                          value={gradingForm.score}
                          onChange={(e) => setGradingForm({ ...gradingForm, score: e.target.value })}
                          className="dash-control placeholder:text-slate-400"
                          placeholder="Введіть оцінку"
                        />
                      </div>
                      {viewingSubmission.submission.status === 'GRADED' && (
                        <div className="flex items-end">
                          <div className="glass p-4 rounded-xl border border-emerald-500/25 dark:border-green-500/30 w-full">
                            <p className="text-sm dash-muted mb-1">Попередня оцінка</p>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-green-400">
                              {viewingSubmission.submission.score} / {viewingSubmission.assignment.maxScore}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium dash-muted mb-2">Відгук для студента</label>
                      <textarea
                        value={gradingForm.feedback}
                        onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                        rows={4}
                        className="dash-control resize-none placeholder:text-slate-400"
                        placeholder="Напишіть відгук для студента..."
                      />
                      {viewingSubmission.submission.feedback && (
                        <p className="text-xs dash-muted-weak mt-2">Попередній відгук: "{viewingSubmission.submission.feedback}"</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setViewingSubmission(null)}
                      className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white rounded-xl font-medium transition"
                    >
                      Закрити
                    </button>
                    <button
                      type="button"
                      onClick={handleGradeSubmitFromModal}
                      className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-fuchsia-600 hover:from-primary-500 hover:to-fuchsia-500 text-white rounded-xl font-medium transition flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Зберегти оцінку
                    </button>
                  </div>
                </>
              ) : (
                <div className="glass p-12 rounded-2xl text-center dash-bordered">
                  <svg className="w-20 h-20 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold dash-fg mb-2">Завдання ще не здано</h3>
                  <p className="dash-muted">Студент не здав це завдання</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradebookPage;

