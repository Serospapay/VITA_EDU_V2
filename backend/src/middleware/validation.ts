import { body, param, query, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError';

/**
 * Middleware для обробки результатів валідації
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg).join(', ');
    throw new AppError(`Validation error: ${errorMessages}`, 400);
  }
  next();
};

/**
 * Валідація реєстрації користувача
 */
export const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Email має бути валідним')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Пароль має містити мінімум 8 символів')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Пароль має містити великі та малі літери, а також цифри'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ім\'я має містити від 2 до 50 символів'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Прізвище має містити від 2 до 50 символів'),
  body('role')
    .optional()
    .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
    .withMessage('Роль має бути STUDENT, TEACHER або ADMIN'),
  handleValidationErrors,
];

/**
 * Валідація входу користувача
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Email має бути валідним')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Пароль обов\'язковий'),
  handleValidationErrors,
];

/**
 * Валідація зміни пароля
 */
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Поточний пароль обов\'язковий'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Новий пароль має містити мінімум 8 символів')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Пароль має містити великі та малі літери, а також цифри'),
  handleValidationErrors,
];

/**
 * Валідація створення курсу
 */
export const validateCreateCourse = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Назва курсу має містити від 3 до 200 символів'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Опис має містити від 10 до 5000 символів'),
  body('level')
    .optional()
    .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
    .withMessage('Рівень має бути BEGINNER, INTERMEDIATE або ADVANCED'),
  body('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
    .withMessage('Статус має бути DRAFT, PUBLISHED або ARCHIVED'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Ціна має бути додатнім числом'),
  handleValidationErrors,
];

/**
 * Валідація ID параметра
 */
export const validateId = [
  param('id')
    .notEmpty()
    .withMessage('ID обов\'язковий')
    .isLength({ min: 1 })
    .withMessage('ID не може бути порожнім'),
  handleValidationErrors,
];

/**
 * Валідація courseId параметра
 */
export const validateCourseId = [
  param('courseId')
    .notEmpty()
    .withMessage('Course ID обов\'язковий')
    .isLength({ min: 1 })
    .withMessage('Course ID не може бути порожнім'),
  handleValidationErrors,
];

/**
 * Валідація створення завдання
 */
export const validateCreateAssignment = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Назва завдання має містити від 3 до 200 символів'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Опис має містити від 10 до 5000 символів'),
  body('type')
    .isIn(['ASSIGNMENT', 'TEST', 'QUIZ', 'PROJECT'])
    .withMessage('Тип має бути ASSIGNMENT, TEST, QUIZ або PROJECT'),
  body('maxScore')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Максимальний бал має бути додатнім числом'),
  body('courseId')
    .notEmpty()
    .withMessage('Course ID обов\'язковий'),
  handleValidationErrors,
];

/**
 * Валідація створення подання
 */
export const validateCreateSubmission = [
  body('assignmentId')
    .notEmpty()
    .withMessage('Assignment ID обов\'язковий'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Контент не може перевищувати 10000 символів'),
  body('githubUrl')
    .optional()
    .isURL()
    .withMessage('GitHub URL має бути валідним'),
  handleValidationErrors,
];

/**
 * Валідація оцінювання подання
 */
export const validateGradeSubmission = [
  param('id')
    .notEmpty()
    .withMessage('Submission ID обов\'язковий'),
  body('score')
    .isFloat({ min: 0 })
    .withMessage('Бал має бути додатнім числом'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Відгук не може перевищувати 2000 символів'),
  handleValidationErrors,
];
