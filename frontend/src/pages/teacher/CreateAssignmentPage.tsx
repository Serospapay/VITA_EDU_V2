import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Question {
  text: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER';
  points: number;
  order: number;
  explanation?: string;
  options?: {
    text: string;
    isCorrect: boolean;
    order: number;
  }[];
}

interface Course {
  id: string;
  title: string;
}

const CreateAssignmentPage = () => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [type, setType] = useState<'TEST' | 'PRACTICAL' | 'PROJECT' | 'QUIZ'>('PRACTICAL');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: courseId || '',
    maxScore: 100,
    passingScore: 60,
    dueDate: '',
    timeLimit: 0,
    maxAttempts: 0,
    allowLateSubmit: false,
    showCorrectAnswers: true,
    shuffleQuestions: false,
    instructions: '',
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        if (!user) return;
        const response = await api.get(`/courses/teacher/${user.id}`);
        setCourses(response.data.data);
      } catch (error: any) {
        console.error('Помилка завантаження курсів:', error);
        toast.error('Помилка завантаження курсів');
      }
    };

    if (user) {
      fetchCourses();
    }
  }, [user]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: '',
        type: 'SINGLE_CHOICE',
        points: 10,
        order: questions.length,
        explanation: '',
        options: [
          { text: '', isCorrect: false, order: 0 },
          { text: '', isCorrect: false, order: 1 },
        ],
      },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    const currentOptions = updated[questionIndex].options || [];
    updated[questionIndex].options = [
      ...currentOptions,
      { text: '', isCorrect: false, order: currentOptions.length },
    ];
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, text: string) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex].text = text;
      setQuestions(updated);
    }
  };

  const toggleCorrect = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    const question = updated[questionIndex];
    
    if (!question.options) return;

    if (question.type === 'SINGLE_CHOICE' || question.type === 'TRUE_FALSE') {
      // Only one correct answer
      question.options.forEach((opt, i) => {
        opt.isCorrect = i === optionIndex;
      });
    } else {
      // Multiple correct answers
      question.options[optionIndex].isCorrect = !question.options[optionIndex].isCorrect;
    }
    
    setQuestions(updated);
  };

  const deleteOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options = updated[questionIndex].options!.filter((_, i) => i !== optionIndex);
      setQuestions(updated);
    }
  };

  const exportTest = () => {
    if (questions.length === 0) {
      toast.error('Немає питань для експорту');
      return;
    }

    const testData = {
      title: formData.title,
      description: formData.description,
      type,
      maxScore: formData.maxScore,
      passingScore: formData.passingScore,
      timeLimit: formData.timeLimit,
      maxAttempts: formData.maxAttempts,
      showCorrectAnswers: formData.showCorrectAnswers,
      shuffleQuestions: formData.shuffleQuestions,
      instructions: formData.instructions,
      questions,
    };

    const blob = new Blob([JSON.stringify(testData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.title || 'test'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Тест експортовано!');
  };

  const importTest = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const testData = JSON.parse(event.target?.result as string);
        
        if (!testData.questions || !Array.isArray(testData.questions)) {
          toast.error('Невірний формат файлу');
          return;
        }

        setFormData({
          ...formData,
          title: testData.title || formData.title,
          description: testData.description || formData.description,
          maxScore: testData.maxScore || formData.maxScore,
          passingScore: testData.passingScore || formData.passingScore,
          timeLimit: testData.timeLimit || formData.timeLimit,
          maxAttempts: testData.maxAttempts || formData.maxAttempts,
          showCorrectAnswers: testData.showCorrectAnswers ?? formData.showCorrectAnswers,
          shuffleQuestions: testData.shuffleQuestions ?? formData.shuffleQuestions,
          instructions: testData.instructions || formData.instructions,
        });

        if (testData.type) {
          setType(testData.type);
        }

        setQuestions(testData.questions);
        toast.success('Тест імпортовано!');
      } catch (error) {
        toast.error('Помилка читання файлу');
        console.error(error);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.courseId) {
      toast.error('Заповніть всі обов\'язкові поля');
      return;
    }

    if ((type === 'TEST' || type === 'QUIZ') && questions.length === 0) {
      toast.error('Додайте хоча б одне питання для тесту');
      return;
    }

    setLoading(true);
    try {
      await api.post('/assignments', {
        ...formData,
        type,
        questions: (type === 'TEST' || type === 'QUIZ') ? questions : [],
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      });

      toast.success('Завдання створено!');
      navigate(`/teacher/courses/${formData.courseId}/edit`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка створення завдання');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
          Створити завдання
        </h1>
        <p className="text-gray-400">Оберіть тип завдання та заповніть деталі</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selection */}
        <div className="glass p-6 rounded-2xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Тип завдання</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['TEST', 'PRACTICAL', 'PROJECT', 'QUIZ'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`p-4 rounded-xl transition ${
                  type === t
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <div className="text-lg font-bold mb-1">
                  {t === 'TEST' && '📝 Тест'}
                  {t === 'PRACTICAL' && '💻 Практика'}
                  {t === 'PROJECT' && '🏆 Проект'}
                  {t === 'QUIZ' && '⚡ Опитування'}
                </div>
                <p className="text-xs opacity-70">
                  {t === 'TEST' && 'Автоматична перевірка'}
                  {t === 'PRACTICAL' && 'Код або файли'}
                  {t === 'PROJECT' && 'Складний проект'}
                  {t === 'QUIZ' && 'Швидке опитування'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="glass p-6 rounded-2xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Основна інформація</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Курс *</label>
              <select
                value={formData.courseId}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                required
              >
                <option value="">Оберіть курс</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Назва завдання *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                placeholder="Наприклад: Тест з основ React"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Опис *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition resize-none"
                placeholder="Коротко опишіть завдання..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Максимальна оцінка</label>
                <input
                  type="number"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Прохідна оцінка (%)</label>
                <input
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Кінцевий термін</label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                />
              </div>
            </div>

            {(type === 'TEST' || type === 'QUIZ') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Ліміт часу (хв)</label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                    min="0"
                    placeholder="0 = без ліміту"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Макс. спроб</label>
                  <input
                    type="number"
                    value={formData.maxAttempts}
                    onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                    min="0"
                    placeholder="0 = необмежено"
                  />
                </div>
              </div>
            )}

            {(type === 'PRACTICAL' || type === 'PROJECT') && (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Інструкції</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition resize-none"
                  placeholder="Детальні інструкції для виконання завдання (можна використовувати Markdown)..."
                />
              </div>
            )}

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowLateSubmit}
                  onChange={(e) => setFormData({ ...formData, allowLateSubmit: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                />
                <span className="text-sm text-gray-300">Дозволити здачу після дедлайну</span>
              </label>

              {(type === 'TEST' || type === 'QUIZ') && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showCorrectAnswers}
                      onChange={(e) => setFormData({ ...formData, showCorrectAnswers: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-sm text-gray-300">Показувати правильні відповіді</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.shuffleQuestions}
                      onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-sm text-gray-300">Перемішувати питання</span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Questions Builder (for TEST/QUIZ) */}
        {(type === 'TEST' || type === 'QUIZ') && (
          <div className="glass p-6 rounded-2xl border border-gray-700">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-bold text-white">Питання тесту</h2>
              <div className="flex items-center gap-2">
                {/* Import Button */}
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Імпорт
                  <input
                    type="file"
                    accept=".json"
                    onChange={importTest}
                    className="hidden"
                  />
                </label>

                {/* Export Button */}
                {questions.length > 0 && (
                  <button
                    type="button"
                    onClick={exportTest}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Експорт
                  </button>
                )}

                {/* Add Question Button */}
                <button
                  type="button"
                  onClick={addQuestion}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-medium transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Додати питання
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium mb-2">Створіть перше питання</p>
                <p className="text-sm">Натисніть "Додати питання" щоб почати</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-5">
                    <div className="flex items-start gap-4 mb-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-sm">
                        {qIdx + 1}
                      </span>
                      <div className="flex-1 space-y-3">
                        {/* Question Type */}
                        <select
                          value={q.type}
                          onChange={(e) => updateQuestion(qIdx, { type: e.target.value as any })}
                          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none transition"
                        >
                          <option value="SINGLE_CHOICE">Один варіант</option>
                          <option value="MULTIPLE_CHOICE">Декілька варіантів</option>
                          <option value="TRUE_FALSE">Так/Ні</option>
                          <option value="SHORT_ANSWER">Коротка відповідь</option>
                          <option value="LONG_ANSWER">Розгорнута відповідь</option>
                        </select>

                        {/* Question Text */}
                        <textarea
                          value={q.text}
                          onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                          placeholder="Введіть текст питання..."
                          rows={2}
                          className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition resize-none"
                        />

                        {/* Points */}
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-300">
                            <span>Балів:</span>
                            <input
                              type="number"
                              value={q.points}
                              onChange={(e) => updateQuestion(qIdx, { points: parseFloat(e.target.value) })}
                              min="0"
                              step="0.5"
                              className="w-20 px-2 py-1 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </label>
                        </div>

                        {/* Options (for choice questions) */}
                        {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-400">Варіанти відповіді</span>
                              {q.type !== 'TRUE_FALSE' && (
                                <button
                                  type="button"
                                  onClick={() => addOption(qIdx)}
                                  className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition"
                                >
                                  + Додати варіант
                                </button>
                              )}
                            </div>
                            {q.options?.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  type={q.type === 'SINGLE_CHOICE' || q.type === 'TRUE_FALSE' ? 'radio' : 'checkbox'}
                                  checked={opt.isCorrect}
                                  onChange={() => toggleCorrect(qIdx, optIdx)}
                                  className="w-5 h-5 rounded border-gray-600 text-green-600 focus:ring-green-500"
                                />
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                                  placeholder={`Варіант ${optIdx + 1}`}
                                  className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                />
                                {q.type !== 'TRUE_FALSE' && q.options!.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => deleteOption(qIdx, optIdx)}
                                    className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Explanation */}
                        <textarea
                          value={q.explanation || ''}
                          onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                          placeholder="Пояснення (опціонально)"
                          rows={2}
                          className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                        />
                      </div>

                      {/* Delete Question */}
                      <button
                        type="button"
                        onClick={() => deleteQuestion(qIdx)}
                        className="flex-shrink-0 p-2 hover:bg-red-500/20 rounded-lg transition text-red-400"
                        title="Видалити питання"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {questions.length > 0 && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Всього питань:</span>
                  <span className="font-bold text-blue-400">{questions.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-300">Загальна кількість балів:</span>
                  <span className="font-bold text-blue-400">{questions.reduce((sum, q) => sum + q.points, 0)}</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition"
          >
            Скасувати
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition"
          >
            {loading ? 'Створення...' : 'Створити завдання'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAssignmentPage;

