import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail?: string;
  price?: number;
  duration?: number;
  level: string;
  teacher: {
    firstName: string;
    lastName: string;
  };
  category?: {
    id: string;
    name: string;
  };
  _count: {
    enrollments: number;
    lessons: number;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const CoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'title'>('popular');

  useEffect(() => {
    fetchCategories();
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [selectedCategory, selectedLevel, searchQuery, sortBy]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        status: 'PUBLISHED',
        limit: 100,
      };

      if (selectedCategory !== 'all') {
        params.categoryId = selectedCategory;
      }

      if (selectedLevel !== 'all') {
        params.level = selectedLevel;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await api.get('/courses', { params });
      let coursesData = response.data.data.courses || [];

      // Sort courses
      if (sortBy === 'popular') {
        coursesData = coursesData.sort((a: Course, b: Course) => 
          (b._count.enrollments || 0) - (a._count.enrollments || 0)
        );
      } else if (sortBy === 'title') {
        coursesData = coursesData.sort((a: Course, b: Course) => 
          a.title.localeCompare(b.title)
        );
      }
      // 'newest' is already sorted by API (orderBy: createdAt desc)

      setCourses(coursesData);
    } catch (error: any) {
      toast.error('Помилка завантаження курсів');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCourses();
  };

  if (loading && courses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-400">Завантаження...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Доступні курси
        </h1>
        <p className="text-gray-400 text-lg">
          Оберіть курс, який допоможе вам досягти ваших цілей
        </p>
      </div>

      {/* Filters */}
      <div className="glass p-6 rounded-2xl border border-gray-700 mb-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук курсів..."
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Категорія</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
            >
              <option value="all">Всі категорії</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Рівень</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
            >
              <option value="all">Всі рівні</option>
              <option value="BEGINNER">Початковий</option>
              <option value="INTERMEDIATE">Середній</option>
              <option value="ADVANCED">Просунутий</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Сортувати</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'newest' | 'title')}
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
            >
              <option value="popular">За популярністю</option>
              <option value="newest">Найновіші</option>
              <option value="title">За назвою</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="mb-6 text-gray-400">
          Знайдено курсів: <span className="text-white font-semibold">{courses.length}</span>
        </div>
      )}

      {/* Courses Grid */}
      {loading && courses.length === 0 ? (
        <div className="text-center text-gray-400 py-12">Завантаження...</div>
      ) : courses.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center border border-gray-700">
          <svg className="w-20 h-20 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">Курсів не знайдено</h3>
          <p className="text-gray-400">Спробуйте змінити параметри пошуку</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="glass p-6 rounded-2xl hover:scale-105 transition-all group border border-gray-700 hover:border-purple-500/50"
            >
              {course.thumbnail && (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-48 object-cover rounded-xl mb-4 group-hover:opacity-90 transition"
                />
              )}
              {!course.thumbnail && (
                <div className="w-full h-48 bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl mb-4 flex items-center justify-center">
                  <svg className="w-20 h-20 text-purple-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                {course.category && (
                  <span className="badge badge-primary text-xs">{course.category.name}</span>
                )}
                <span className="badge bg-gray-700 text-white text-xs">{course.level}</span>
              </div>

              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-purple-400 transition">
                {course.title}
              </h3>
              <p className="text-gray-400 mb-4 line-clamp-2 text-sm">{course.description}</p>

              <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                <span>👨‍🏫 {course.teacher.firstName} {course.teacher.lastName}</span>
                <span>👥 {course._count.enrollments || 0}</span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-400">
                  📚 {course._count.lessons} уроків
                  {course.duration && ` • ⏱ ${course.duration} год`}
                </div>
              </div>

              <div className="flex items-center justify-between">
                {course.price !== undefined && course.price > 0 ? (
                  <p className="text-2xl font-bold text-purple-400">{course.price} ₴</p>
                ) : (
                  <p className="text-xl font-bold text-green-400">Безкоштовно</p>
                )}
                <span className="btn btn-primary text-sm">Детальніше →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
