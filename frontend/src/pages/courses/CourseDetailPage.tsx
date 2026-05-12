import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  price?: number;
  duration?: number;
  level: string;
  status: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    bio?: string;
    avatar?: string;
  };
  category?: {
    name: string;
    color: string;
  };
  lessons: Array<{
    id: string;
    title: string;
    duration: number;
    order: number;
    isPublished: boolean;
    isFree: boolean;
  }>;
  _count: {
    enrollments: number;
    assignments: number;
    quizzes: number;
  };
}

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCourse();
      // Only check enrollment if user is logged in
      if (user) {
        checkEnrollment();
      }
    }
  }, [id, user]);

  const fetchCourse = async () => {
    try {
      const response = await api.get(`/courses/${id}`);
      setCourse(response.data.data);
    } catch (error: any) {
      toast.error('Помилка завантаження курсу');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    try {
      const response = await api.get('/enrollments/my');
      const enrollments = response.data.data;
      const enrolled = enrollments.some(
        (e: any) => e.course.id === id || e.courseId === id
      );
      setIsEnrolled(enrolled);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      // Redirect to registration with courseId
      navigate(`/register?courseId=${id}`);
      toast('Зареєструйтесь щоб записатися на курс', { icon: '👋' });
      return;
    }

    setEnrolling(true);
    try {
      await api.post('/enrollments', { courseId: id });
      toast.success('Ви успішно записались на курс!');
      setIsEnrolled(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка запису на курс');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-700 dark:text-gray-400">Завантаження...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass p-8 rounded-2xl text-center">
          <p className="text-gray-700 dark:text-gray-400 mb-4">Курс не знайдено</p>
          <Link to="/courses" className="btn btn-primary">
            Повернутись до курсів
          </Link>
        </div>
      </div>
    );
  }

  const totalDuration = course.lessons.reduce((sum, lesson) => sum + lesson.duration, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="glass p-8 rounded-2xl mb-8 border border-gray-200 dark:border-transparent">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Course Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {course.category && (
                <span
                  className="badge text-xs px-3 py-1 rounded-full"
                  style={{ backgroundColor: course.category.color }}
                >
                  {course.category.name}
                </span>
              )}
              <span className="badge bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-xs px-3 py-1 rounded-full">
                {course.level}
              </span>
            </div>

            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {course.title}
            </h1>

            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">{course.description}</p>

            <div className="flex items-center gap-4 mb-6">
              {course.teacher.avatar && (
                <img
                  src={course.teacher.avatar}
                  alt={`${course.teacher.firstName} ${course.teacher.lastName}`}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Викладач</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {course.teacher.firstName} {course.teacher.lastName}
                </p>
              </div>
            </div>

            {course.teacher.bio && (
              <p className="text-sm text-gray-700 dark:text-gray-400 mb-6 leading-relaxed">{course.teacher.bio}</p>
            )}

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-transparent">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{course.lessons.length}</p>
                <p className="text-xs text-gray-700 dark:text-gray-400 font-semibold">Уроків</p>
              </div>
              <div className="text-center p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-transparent">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totalDuration}</p>
                <p className="text-xs text-gray-700 dark:text-gray-400 font-semibold">Хвилин</p>
              </div>
              <div className="text-center p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-transparent">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{course._count.enrollments}</p>
                <p className="text-xs text-gray-700 dark:text-gray-400 font-semibold">Студентів</p>
              </div>
            </div>

            {course.price !== undefined && (
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-6">{course.price} ₴</p>
            )}

            {/* Show enroll button for non-authenticated users and students */}
            {(!user || user.role === 'STUDENT') && !isEnrolled && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="btn btn-primary w-full"
              >
                {enrolling ? 'Записуємось...' : !user ? 'Зареєструватись на курс' : 'Записатись на курс'}
              </button>
            )}

            {isEnrolled && (
              <div className="bg-green-500/20 border border-green-500 text-green-400 p-4 rounded-xl">
                ✓ Ви записані на цей курс
              </div>
            )}
          </div>

          {/* Right: Thumbnail */}
          <div>
            {course.thumbnail && (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover rounded-2xl"
              />
            )}
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="glass p-8 rounded-2xl mb-8 border border-gray-200 dark:border-transparent">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Програма курсу</h2>
          {!user && (
            <span className="text-sm text-gray-700 dark:text-gray-400">
              Зареєструйтесь для доступу до уроків
            </span>
          )}
        </div>

        {course.lessons.length === 0 ? (
          <p className="text-gray-700 dark:text-gray-400">Уроки ще не додані</p>
        ) : (
          <div className="space-y-3">
            {course.lessons
              .sort((a, b) => a.order - b.order)
              .map((lesson, index) => {
                const isAccessible = user || lesson.isFree;

                return isAccessible ? (
                  <Link
                    key={lesson.id}
                    to={`/courses/${course.id}/lessons/${lesson.id}`}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-transparent transition hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {lesson.title}
                          {!isAccessible && (
                            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{lesson.duration} хв</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {lesson.isFree && (
                        <span className="badge bg-green-500 text-white text-xs">
                          Безкоштовно
                        </span>
                      )}
                      {!lesson.isPublished && (
                        <span className="badge bg-gray-600 text-white text-xs">
                          Не опубліковано
                        </span>
                      )}
                      <span className="text-purple-600 dark:text-purple-400">→</span>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-transparent transition opacity-60 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{lesson.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-yellow-500 text-white text-xs">
                        Потрібна реєстрація
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl border border-gray-200 dark:border-transparent">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">📝 Завдання</h3>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
            {course._count.assignments}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-400">Практичних завдань для закріплення матеріалу</p>
        </div>

        <div className="glass p-6 rounded-2xl border border-gray-200 dark:border-transparent">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">📊 Тести</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            {course._count.quizzes}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-400">Тестів для перевірки знань</p>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;

