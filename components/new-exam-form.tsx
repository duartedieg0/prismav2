'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, FileUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  validateExamName,
  validatePdfFile,
  validateSupports,
  validateSubjectId,
  validateGradeLevelId,
} from '@/lib/utils/form-validation';

interface Subject {
  id: string;
  name: string;
}

interface GradeLevel {
  id: string;
  name: string;
  level: number;
}

interface Support {
  id: string;
  name: string;
  description?: string;
}

interface NewExamFormProps {
  subjects: Subject[];
  gradeLevels: GradeLevel[];
  supports: Support[];
}

interface FormErrors {
  exam_name?: string;
  subject_id?: string;
  grade_level_id?: string;
  supports?: string;
  pdf_file?: string;
  submit?: string;
}

export function NewExamForm({
  subjects,
  gradeLevels,
  supports,
}: NewExamFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    exam_name: '',
    subject_id: '',
    grade_level_id: '',
    supports: [] as string[],
    pdf_file: null as File | null,
  });
  const [pdfFileName, setPdfFileName] = useState<string>('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate exam name
    const nameValidation = validateExamName(formData.exam_name);
    if (!nameValidation.valid) {
      newErrors.exam_name = nameValidation.error;
    }

    // Validate subject
    const subjectValidation = validateSubjectId(formData.subject_id);
    if (!subjectValidation.valid) {
      newErrors.subject_id = 'Selecione uma disciplina válida';
    }

    // Validate grade level
    const gradeValidation = validateGradeLevelId(formData.grade_level_id);
    if (!gradeValidation.valid) {
      newErrors.grade_level_id = 'Selecione uma série válida';
    }

    // Validate supports
    const supportsValidation = validateSupports(formData.supports);
    if (!supportsValidation.valid) {
      newErrors.supports = supportsValidation.error;
    }

    // Validate PDF file
    if (!formData.pdf_file) {
      newErrors.pdf_file = 'Selecione um arquivo PDF';
    } else {
      const pdfValidation = validatePdfFile(formData.pdf_file);
      if (!pdfValidation.valid) {
        newErrors.pdf_file = pdfValidation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleExamNameChange = (value: string) => {
    setFormData({ ...formData, exam_name: value });
    if (errors.exam_name) {
      setErrors({ ...errors, exam_name: undefined });
    }
  };

  const handleSubjectChange = (value: string) => {
    setFormData({ ...formData, subject_id: value });
    if (errors.subject_id) {
      setErrors({ ...errors, subject_id: undefined });
    }
  };

  const handleGradeLevelChange = (value: string) => {
    setFormData({ ...formData, grade_level_id: value });
    if (errors.grade_level_id) {
      setErrors({ ...errors, grade_level_id: undefined });
    }
  };

  const handleSupportToggle = (supportId: string) => {
    const updated = formData.supports.includes(supportId)
      ? formData.supports.filter((id) => id !== supportId)
      : [...formData.supports, supportId];
    setFormData({ ...formData, supports: updated });
    if (errors.supports) {
      setErrors({ ...errors, supports: undefined });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) {
      setFormData({ ...formData, pdf_file: file });
      setPdfFileName(file.name);
      if (errors.pdf_file) {
        setErrors({ ...errors, pdf_file: undefined });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('subjectId', formData.subject_id);
      formDataToSend.append('gradeLevelId', formData.grade_level_id);
      formDataToSend.append('pdf', formData.pdf_file!);
      formData.supports.forEach((supportId) => {
        formDataToSend.append('supportIds', supportId);
      });

      const response = await fetch('/api/exams', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrors({
          submit: errorData.error || 'Erro ao criar prova. Tente novamente.',
        });
        return;
      }

      const data = await response.json();
      router.push(`/exams/${data.id}/extraction`);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({
        submit: 'Erro ao enviar formulário. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6">
      <Card className="p-6 sm:p-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Nova Prova
          </h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados da prova e faça upload do PDF para começar a extração de questões.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exam Name */}
          <div className="space-y-2">
            <Label htmlFor="exam-name" className="text-sm font-medium">
              Nome da Prova <span className="text-destructive">*</span>
            </Label>
            <Input
              id="exam-name"
              type="text"
              placeholder="Ex: Prova de Matemática - 1º Bimestre"
              value={formData.exam_name}
              onChange={(e) => handleExamNameChange(e.target.value)}
              disabled={isLoading}
              aria-invalid={!!errors.exam_name}
              aria-describedby={errors.exam_name ? 'exam-name-error' : undefined}
              className="w-full"
            />
            {errors.exam_name && (
              <div
                id="exam-name-error"
                className="flex items-center gap-2 text-sm text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" />
                {errors.exam_name}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Disciplina <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.subject_id}
              onValueChange={handleSubjectChange}
              disabled={isLoading}
            >
              <SelectTrigger
                id="subject"
                aria-invalid={!!errors.subject_id}
                aria-describedby={
                  errors.subject_id ? 'subject-error' : undefined
                }
              >
                <SelectValue placeholder="Selecione uma disciplina" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.subject_id && (
              <div
                id="subject-error"
                className="flex items-center gap-2 text-sm text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" />
                {errors.subject_id}
              </div>
            )}
          </div>

          {/* Grade Level */}
          <div className="space-y-2">
            <Label htmlFor="grade-level" className="text-sm font-medium">
              Série <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.grade_level_id}
              onValueChange={handleGradeLevelChange}
              disabled={isLoading}
            >
              <SelectTrigger
                id="grade-level"
                aria-invalid={!!errors.grade_level_id}
                aria-describedby={
                  errors.grade_level_id ? 'grade-level-error' : undefined
                }
              >
                <SelectValue placeholder="Selecione uma série" />
              </SelectTrigger>
              <SelectContent>
                {gradeLevels.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.grade_level_id && (
              <div
                id="grade-level-error"
                className="flex items-center gap-2 text-sm text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" />
                {errors.grade_level_id}
              </div>
            )}
          </div>

          {/* Supports Checkboxes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium block">
              Suportes Educacionais <span className="text-destructive">*</span>
            </Label>
            <div className="space-y-2">
              {supports.map((support) => (
                <div key={support.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`support-${support.id}`}
                    checked={formData.supports.includes(support.id)}
                    onCheckedChange={() => handleSupportToggle(support.id)}
                    disabled={isLoading}
                    aria-describedby={
                      support.description ? `support-desc-${support.id}` : undefined
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`support-${support.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {support.name}
                    </Label>
                    {support.description && (
                      <p
                        id={`support-desc-${support.id}`}
                        className="text-xs text-muted-foreground mt-1"
                      >
                        {support.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {errors.supports && (
              <div
                className="flex items-center gap-2 text-sm text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" />
                {errors.supports}
              </div>
            )}
          </div>

          {/* PDF File Upload */}
          <div className="space-y-2">
            <Label htmlFor="pdf-file" className="text-sm font-medium">
              Arquivo PDF <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="pdf-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={isLoading}
                aria-invalid={!!errors.pdf_file}
                aria-describedby={
                  errors.pdf_file ? 'pdf-file-error' : 'pdf-file-hint'
                }
                className="w-full cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
              />
            </div>
            {pdfFileName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileUp className="h-4 w-4" />
                {pdfFileName}
              </div>
            )}
            {!errors.pdf_file && (
              <p
                id="pdf-file-hint"
                className="text-xs text-muted-foreground"
              >
                Máximo de 10 MB. Apenas arquivos PDF são aceitos.
              </p>
            )}
            {errors.pdf_file && (
              <div
                id="pdf-file-error"
                className="flex items-center gap-2 text-sm text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" />
                {errors.pdf_file}
              </div>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div
              className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
              size="lg"
            >
              {isLoading ? 'Criando prova...' : 'Criar Prova e Extrair Questões'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
