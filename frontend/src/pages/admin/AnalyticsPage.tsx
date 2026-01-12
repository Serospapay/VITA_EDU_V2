import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { logger } from '../../utils/logger';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface CourseStats {
  id: string;
  title: string;
  teacher: {
    firstName: string;
    lastName: string;
  };
  _count: {
    enrollments: number;
    lessons: number;
  };
  enrollments: Array<{
    progress: number;
    completedAt: string | null;
  }>;
  status: string;
}

interface TeacherStats {
  id: string;
  firstName: string;
  lastName: string;
  _count: {
    courses: number;
  };
  totalStudents: number;
  averageProgress: number;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  teacher?: {
    id: string;
  };
}

interface Course {
  id: string;
  title: string;
  teacherId?: string;
  teacher?: {
    id: string;
  };
  _count?: {
    enrollments: number;
  };
  enrollments?: Array<{
    progress: number;
  }>;
}

interface Enrollment {
  progress: number;
}

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseStats[]>([]);
  const [teachers, setTeachers] = useState<TeacherStats[]>([]);
  const [activeTab, setActiveTab] = useState<'courses' | 'teachers'>('courses');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [coursesRes, teachersRes] = await Promise.all([
        api.get('/courses?limit=100'),
        api.get('/users?limit=100'),
      ]);

      const coursesData = coursesRes.data.data.courses || coursesRes.data.data;
      setCourses(coursesData);

      const usersData = teachersRes.data.data;
      const users: User[] = usersData.users || usersData;
      const teachersList = users.filter((u: User) => u.role === 'TEACHER');

      const teacherStats = teachersList.map((teacher: User) => {
        // Check both teacherId and teacher.id for compatibility
        const teacherCourses = coursesData.filter(
          (c: Course) => c.teacherId === teacher.id || c.teacher?.id === teacher.id
        );
        const totalStudents = teacherCourses.reduce(
          (sum: number, c: Course) => sum + (c._count?.enrollments || 0),
          0
        );
        const totalProgress = teacherCourses.reduce((sum: number, c: Course) => {
          const courseProgress =
            c.enrollments?.reduce((s: number, e: Enrollment) => s + e.progress, 0) || 0;
          return sum + courseProgress;
        }, 0);
        const avgProgress = totalStudents > 0 ? totalProgress / totalStudents : 0;

        return {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          _count: {
            courses: teacherCourses.length,
          },
          totalStudents,
          averageProgress: avgProgress,
        };
      });

      setTeachers(teacherStats);
    } catch (error: unknown) {
      toast.error('Помилка завантаження аналітики');
      if (error instanceof Error) {
        logger.error('Analytics fetch error:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCompletedCount = (course: CourseStats) => {
    return course.enrollments?.filter((e) => e.completedAt !== null).length || 0;
  };

  const getAverageProgress = (course: CourseStats) => {
    if (!course.enrollments || course.enrollments.length === 0) return 0;
    const total = course.enrollments.reduce((sum, e) => sum + e.progress, 0);
    return total / course.enrollments.length;
  };

  const topCoursesByStudents = [...courses]
    .sort((a, b) => (b._count?.enrollments || 0) - (a._count?.enrollments || 0))
    .slice(0, 5);

  const publishedCount = courses.filter((c) => c.status === 'PUBLISHED').length;
  const draftCount = courses.filter((c) => c.status === 'DRAFT').length;
  const archivedCount = courses.filter((c) => c.status === 'ARCHIVED').length;

  const courseStatusData = {
    labels: ['Опубліковано', 'Чернетки', 'Архівовано'],
    datasets: [
      {
        data: [publishedCount, draftCount, archivedCount],
        backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(234, 179, 8, 0.8)', 'rgba(107, 114, 128, 0.8)'],
        borderWidth: 0,
      },
    ],
  };

  const studentsPerCourseData = {
    labels: topCoursesByStudents.map((c) => c.title.length > 20 ? c.title.slice(0, 20) + '...' : c.title),
    datasets: [
      {
        label: 'Студентів',
        data: topCoursesByStudents.map((c) => c._count?.enrollments || 0),
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        border: { display: false },
      },
      x: {
        ticks: { color: '#9CA3AF' },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#fff',
          font: { size: 12 },
          padding: 15,
          usePointStyle: true,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
          <p className="mt-4 text-gray-400">Завантаження аналітики...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
          Аналітика та звіти
        </h1>
        <p className="text-gray-400">Детальна статистика успішності платформи</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-2xl border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-green-400">{publishedCount}</span>
          </div>
          <p className="text-gray-400 text-sm">Активних курсів</p>
        </div>

        <div className="glass p-6 rounded-2xl border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-purple-400">
              {courses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0)}
            </span>
          </div>
          <p className="text-gray-400 text-sm">Всього студентів</p>
        </div>

        <div className="glass p-6 rounded-2xl border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-blue-400">
              {teachers.filter((t) => t._count.courses > 0).length}
            </span>
          </div>
          <p className="text-gray-400 text-sm">Активних викладачів</p>
        </div>

        <div className="glass p-6 rounded-2xl border border-orange-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-orange-400">
              {courses.length > 0
                ? (courses.reduce((sum, c) => sum + getAverageProgress(c), 0) / courses.length).toFixed(0)
                : 0}
              %
            </span>
          </div>
          <p className="text-gray-400 text-sm">Середній прогрес</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></span>
            ТОП-5 курсів за популярністю
          </h3>
          <div style={{ height: '300px' }}>
            <Bar data={studentsPerCourseData} options={chartOptions} />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-green-500 to-blue-500 rounded-full"></span>
            Статуси курсів
          </h3>
          <div style={{ height: '300px' }}>
            <Doughnut data={courseStatusData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'courses'
              ? 'text-purple-400 border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Курси
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'teachers'
              ? 'text-purple-400 border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          👨‍🏫 Викладачі
        </button>
      </div>

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const avgProgress = getAverageProgress(course);
            const completed = getCompletedCount(course);
            const completionRate =
              course._count.enrollments > 0 ? (completed / course._count.enrollments) * 100 : 0;

            return (
              <Link
                key={course.id}
                to={`/admin/courses/${course.id}/students`}
                className="glass p-6 rounded-2xl border border-gray-700 hover:border-purple-500/50 transition group"
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      course.status === 'PUBLISHED'
                        ? 'bg-green-500/20 text-green-400'
                        : course.status === 'DRAFT'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {course.status === 'PUBLISHED' ? '● Активний' : course.status === 'DRAFT' ? '● Чернетка' : '● Архів'}
                  </span>
                  <svg className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition">
                  {course.title}
                </h3>

                {/* Teacher */}
                <p className="text-sm text-gray-400 mb-4">
                  👨‍🏫 {course.teacher.firstName} {course.teacher.lastName}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{course._count.enrollments}</div>
                    <div className="text-xs text-gray-500">студентів</div>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{course._count.lessons}</div>
                    <div className="text-xs text-gray-500">уроків</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Прогрес</span>
                    <span>{avgProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                      style={{ width: `${avgProgress}%` }}
                    />
                  </div>
                </div>

                {/* Completion */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Завершили:</span>
                  <span className="text-green-400 font-medium">
                    {completed} ({completionRate.toFixed(0)}%)
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Teachers Tab */}
      {activeTab === 'teachers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers
            .sort((a, b) => b.totalStudents - a.totalStudents)
            .map((teacher, index) => (
              <div
                key={teacher.id}
                className="glass p-6 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition group"
              >
                {/* Rank Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? 'bg-yellow-500 text-yellow-900'
                        : index === 1
                        ? 'bg-gray-400 text-gray-900'
                        : index === 2
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    #{index + 1}
                  </div>
                  {index < 3 && (
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-xl font-bold text-white mb-1">
                  {teacher.firstName} {teacher.lastName}
                </h3>
                <p className="text-sm text-gray-400 mb-4">Викладач VITA-Edu</p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-3 rounded-lg border border-purple-500/20">
                    <div className="text-2xl font-bold text-purple-400">{teacher._count.courses}</div>
                    <div className="text-xs text-gray-400">курсів</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-3 rounded-lg border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-400">{teacher.totalStudents}</div>
                    <div className="text-xs text-gray-400">студентів</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Успішність студентів</span>
                    <span>{teacher.averageProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${teacher.averageProgress}%` }}
                    />
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mt-3">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-lg ${
                        i < Math.floor(teacher.averageProgress / 20)
                          ? 'text-yellow-400'
                          : 'text-gray-600'
                      }`}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
