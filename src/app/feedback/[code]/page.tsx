'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import logo from '@/assets/logo.png';

interface BatchItem {
    _id: string;
    name: string;
}

interface TeacherMapping {
    _id: string;
    teacher: { _id: string; name: string; shortName: string };
    subject: { _id: string; name: string; code?: string };
    teachingType: 'theory' | 'practical' | 'sla';
    batches?: { _id: string; name: string }[];
}

interface Question {
    _id: string;
    text: string;
    type: 'abcd_grade' | 'text' | 'yes_no';
    category?: string;
}

interface SessionInfo {
    id: string;
    class: { _id: string; displayName: string };
    department: { _id: string; name: string };
    remainingSlots: number;
    alreadySubmitted: boolean;
}

const typeLabels: Record<string, string> = {
    theory: 'Theory',
    practical: 'Practical',
};

const gradeOptions = [
    { value: 'A', label: 'A', points: '10', color: 'bg-green-500 hover:bg-green-600' },
    { value: 'B', label: 'B', points: '7.5', color: 'bg-blue-500 hover:bg-blue-600' },
    { value: 'C', label: 'C', points: '5', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { value: 'D', label: 'D', points: '2.5', color: 'bg-red-400 hover:bg-red-500' },
];

// Header component - defined outside to prevent re-renders on state change
const Header = () => (
    <div className="bg-gradient-to-r from-red-700 to-red-600 text-white py-4 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 relative flex-shrink-0">
                <Image
                    src={logo}
                    alt="SGI Logo"
                    fill
                    className="object-contain"
                    priority
                />
            </div>
            <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold truncate">Sanjay Ghodawat Institute</h1>
                <p className="text-red-100 text-xs sm:text-sm truncate">Student Feedback System</p>
            </div>
        </div>
    </div>
);

export default function FeedbackPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);

    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [batches, setBatches] = useState<BatchItem[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [mappings, setMappings] = useState<TeacherMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [feedbackStarted, setFeedbackStarted] = useState(false);

    // Form state
    const [selectedBatch, setSelectedBatch] = useState<string>('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState<Record<string, {
        teacherResponses?: Record<string, string>;
        textResponse?: string;
        yesNoResponse?: boolean;
    }>>({});

    useEffect(() => {
        fetchFeedbackData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    const fetchFeedbackData = async () => {
        try {
            const res = await fetch(`/api/feedback/${code}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to load feedback');
                return;
            }

            setSessionInfo(data.session);
            setBatches(data.batches || []);
            setQuestions(data.questions || []);
            setMappings(data.mappings || []);
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to load feedback');
        } finally {
            setIsLoading(false);
        }
    };

    const getRelevantMappings = () => {
        if (!selectedBatch) return mappings;
        return mappings.filter((m) => {
            if (m.teachingType !== 'practical') return true;
            if (!m.batches || m.batches.length === 0) return true;
            return m.batches.some((b) => b._id === selectedBatch);
        });
    };

    const relevantMappings = getRelevantMappings();
    const currentQuestion = questions[currentQuestionIndex];

    const isQuestionComplete = () => {
        if (!currentQuestion) return false;
        const response = responses[currentQuestion._id];
        if (!response) return currentQuestion.type === 'text';

        if (currentQuestion.type === 'abcd_grade') {
            if (!response.teacherResponses) return false;
            return relevantMappings.every((m) => response.teacherResponses?.[m._id]);
        }

        if (currentQuestion.type === 'yes_no') {
            return response.yesNoResponse !== undefined;
        }
        return true;
    };

    const handleGradeChange = (mappingId: string, grade: string) => {
        setResponses((prev) => ({
            ...prev,
            [currentQuestion._id]: {
                ...prev[currentQuestion._id],
                teacherResponses: {
                    ...prev[currentQuestion._id]?.teacherResponses,
                    [mappingId]: grade,
                },
            },
        }));
    };

    const handleTextChange = (text: string) => {
        setResponses((prev) => ({
            ...prev,
            [currentQuestion._id]: {
                ...prev[currentQuestion._id],
                textResponse: text,
            },
        }));
    };

    const handleYesNoChange = (value: boolean) => {
        setResponses((prev) => ({
            ...prev,
            [currentQuestion._id]: {
                ...prev[currentQuestion._id],
                yesNoResponse: value,
            },
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const formattedResponses = questions.map((q) => {
                const response = responses[q._id] || {};

                if (q.type === 'abcd_grade' && response.teacherResponses) {
                    return {
                        questionId: q._id,
                        type: q.type,
                        teacherResponses: Object.entries(response.teacherResponses).map(([mappingId, grade]) => {
                            const mapping = mappings.find((m) => m._id === mappingId);
                            return {
                                teacherId: mapping?.teacher._id,
                                teachingType: mapping?.teachingType,
                                grade,
                            };
                        }),
                    };
                }

                return {
                    questionId: q._id,
                    type: q.type,
                    textResponse: response.textResponse,
                    yesNoResponse: response.yesNoResponse,
                };
            });

            const res = await fetch(`/api/feedback/${code}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batchId: selectedBatch || undefined,
                    responses: formattedResponses,
                }),
            });

            if (res.ok) {
                setIsSubmitted(true);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to submit feedback');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Failed to submit feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading feedback form...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center py-20 px-4">
                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full text-center border-t-4 border-red-600">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
                        <p className="text-gray-600">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center py-20 px-4">
                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full text-center border-t-4 border-green-500">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Thank You!</h2>
                        <p className="text-gray-600">Your feedback has been submitted successfully.</p>
                        <p className="text-sm text-gray-500 mt-4">Your responses will help improve the quality of education.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Already submitted state
    if (sessionInfo?.alreadySubmitted) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center py-20 px-4">
                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full text-center border-t-4 border-amber-500">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Already Submitted</h2>
                        <p className="text-gray-600">You have already submitted feedback for this session.</p>
                        <p className="text-sm text-gray-500 mt-4">Each student can only submit one feedback response.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Welcome screen
    if (!feedbackStarted) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center py-10 sm:py-20 px-4">
                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full border-t-4 border-red-600">
                        <div className="text-center mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Student Feedback</h2>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-gray-600">
                                <span>{sessionInfo?.department.name}</span>
                                <span className="hidden sm:inline">•</span>
                                <Badge variant="secondary" className="bg-red-100 text-red-700">
                                    {sessionInfo?.class.displayName}
                                </Badge>
                            </div>
                        </div>

                        {batches.length > 0 && (
                            <div className="mb-6">
                                <Label className="text-gray-700 font-medium">Select Your Batch</Label>
                                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                                    <SelectTrigger className="mt-2 border-gray-300 focus:border-red-500 focus:ring-red-500">
                                        <SelectValue placeholder="Choose your batch..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {batches.map((batch) => (
                                            <SelectItem key={batch._id} value={batch._id}>
                                                {batch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <Button
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-semibold rounded-lg shadow-md transition-all"
                            onClick={() => setFeedbackStarted(true)}
                            disabled={batches.length > 0 && !selectedBatch}
                        >
                            Start Feedback
                        </Button>

                        <p className="text-center text-sm text-gray-500 mt-4">
                            {questions.length} questions • ~5 minutes
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Main feedback form
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Progress bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span className="font-medium">Question {currentQuestionIndex + 1} of {questions.length}</span>
                        <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Class info badge */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="border-red-200 text-red-700">
                        {sessionInfo?.class.displayName}
                    </Badge>
                    {selectedBatch && (
                        <Badge variant="outline" className="border-gray-300">
                            {batches.find((b) => b._id === selectedBatch)?.name}
                        </Badge>
                    )}
                </div>

                {/* Question Card */}
                {currentQuestion && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                        {/* Question header */}
                        <div className="bg-red-600 text-white px-4 sm:px-6 py-4">
                            {currentQuestion.category && (
                                <span className="inline-block bg-red-500 text-white text-xs px-2 py-1 rounded mb-2">
                                    {currentQuestion.category}
                                </span>
                            )}
                            <h3 className="text-base sm:text-lg font-semibold">{currentQuestion.text}</h3>
                        </div>

                        {/* Question content */}
                        <div className="p-4 sm:p-6">
                            {currentQuestion.type === 'abcd_grade' && (
                                <div className="space-y-4">
                                    {relevantMappings.map((mapping) => (
                                        <div key={mapping._id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="mb-3">
                                                <p className="font-semibold text-gray-800">{mapping.teacher.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {mapping.subject.name}
                                                    <Badge variant="outline" className="ml-2 text-xs">
                                                        {typeLabels[mapping.teachingType]}
                                                    </Badge>
                                                </p>
                                            </div>

                                            {/* Grade buttons - mobile optimized */}
                                            <div className="grid grid-cols-4 gap-2">
                                                {gradeOptions.map((option) => {
                                                    const isSelected = responses[currentQuestion._id]?.teacherResponses?.[mapping._id] === option.value;
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => handleGradeChange(mapping._id, option.value)}
                                                            className={`
                                                                py-3 rounded-lg font-bold text-lg transition-all
                                                                ${isSelected
                                                                    ? `${option.color} text-white shadow-md scale-105`
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                }
                                                            `}
                                                        >
                                                            {option.label}
                                                            <span className="block text-xs font-normal opacity-75">{option.points}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {currentQuestion.type === 'text' && (
                                <Textarea
                                    placeholder="Enter your response (optional)..."
                                    value={responses[currentQuestion._id]?.textResponse || ''}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    rows={5}
                                    className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                                />
                            )}

                            {currentQuestion.type === 'yes_no' && (
                                <RadioGroup
                                    value={
                                        responses[currentQuestion._id]?.yesNoResponse === true ? 'yes' :
                                            responses[currentQuestion._id]?.yesNoResponse === false ? 'no' : ''
                                    }
                                    onValueChange={(value) => handleYesNoChange(value === 'yes')}
                                    className="flex gap-4"
                                >
                                    <div className="flex-1">
                                        <label
                                            className={`
                                                flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all
                                                ${responses[currentQuestion._id]?.yesNoResponse === true
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }
                                            `}
                                        >
                                            <RadioGroupItem value="yes" id="yes" className="sr-only" />
                                            <span className="font-semibold">Yes</span>
                                        </label>
                                    </div>
                                    <div className="flex-1">
                                        <label
                                            className={`
                                                flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all
                                                ${responses[currentQuestion._id]?.yesNoResponse === false
                                                    ? 'border-red-500 bg-red-50 text-red-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }
                                            `}
                                        >
                                            <RadioGroupItem value="no" id="no" className="sr-only" />
                                            <span className="font-semibold">No</span>
                                        </label>
                                    </div>
                                </RadioGroup>
                            )}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        className="flex-1 py-6 border-gray-300"
                    >
                        ← Previous
                    </Button>

                    {currentQuestionIndex < questions.length - 1 ? (
                        <Button
                            onClick={handleNext}
                            disabled={!isQuestionComplete()}
                            className="flex-1 py-6 bg-red-600 hover:bg-red-700"
                        >
                            Next →
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={!isQuestionComplete() || isSubmitting}
                            className="flex-1 py-6 bg-green-600 hover:bg-green-700"
                        >
                            {isSubmitting ? 'Submitting...' : '✓ Submit'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
