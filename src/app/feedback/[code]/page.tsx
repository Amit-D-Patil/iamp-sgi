'use client';

import { useState, useEffect, use } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
    { value: 'A', label: 'A', points: '10 pts' },
    { value: 'B', label: 'B', points: '7.5 pts' },
    { value: 'C', label: 'C', points: '5 pts' },
    { value: 'D', label: 'D', points: '2.5 pts' },
];

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
        teacherResponses?: Record<string, string>; // mappingId -> grade
        textResponse?: string;
        yesNoResponse?: boolean;
    }>>({});

    useEffect(() => {
        fetchFeedbackData();
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

    // Filter mappings based on selected batch (for practical)
    const getRelevantMappings = () => {
        if (!selectedBatch) return mappings;

        return mappings.filter((m) => {
            // Theory and SLA apply to everyone
            if (m.teachingType !== 'practical') return true;

            // For practical, check if batch is included
            if (!m.batches || m.batches.length === 0) return true; // No batch restriction
            return m.batches.some((b) => b._id === selectedBatch);
        });
    };

    const relevantMappings = getRelevantMappings();
    const currentQuestion = questions[currentQuestionIndex];

    const isQuestionComplete = () => {
        if (!currentQuestion) return false;

        const response = responses[currentQuestion._id];
        if (!response) return currentQuestion.type === 'text'; // Text is optional

        if (currentQuestion.type === 'abcd_grade') {
            // All teachers must be rated
            if (!response.teacherResponses) return false;
            return relevantMappings.every((m) => response.teacherResponses?.[m._id]);
        }

        if (currentQuestion.type === 'yes_no') {
            return response.yesNoResponse !== undefined;
        }

        return true; // Text is optional
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
            // Format responses for API
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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-lg">Loading feedback form...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-green-600">Thank You!</CardTitle>
                        <CardDescription>
                            Your feedback has been submitted successfully.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Your responses will help improve the quality of education.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Check if already submitted via cookie
    if (sessionInfo?.alreadySubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-amber-600">Already Submitted</CardTitle>
                        <CardDescription>
                            You have already submitted feedback for this session.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Each student can only submit one feedback response.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Welcome screen - before starting feedback
    if (!feedbackStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Student Feedback</CardTitle>
                        <CardDescription>
                            {sessionInfo?.department.name} - {sessionInfo?.class.displayName}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {batches.length > 0 && (
                            <div className="space-y-2">
                                <Label>Select Your Batch</Label>
                                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select your batch" />
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
                            className="w-full"
                            size="lg"
                            onClick={() => setFeedbackStarted(true)}
                            disabled={batches.length > 0 && !selectedBatch}
                        >
                            Start Feedback
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold">Student Feedback</h1>
                    <p className="text-muted-foreground">
                        {sessionInfo?.department.name} - {sessionInfo?.class.displayName}
                    </p>
                    {selectedBatch && selectedBatch !== 'none' && (
                        <Badge variant="outline" className="mt-2">
                            {batches.find((b) => b._id === selectedBatch)?.name}
                        </Badge>
                    )}
                </div>

                {/* Progress */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                        <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% complete</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Question Card */}
                {currentQuestion && (
                    <Card className="mb-6">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    {currentQuestion.category && (
                                        <Badge variant="secondary" className="mb-2">
                                            {currentQuestion.category}
                                        </Badge>
                                    )}
                                    <CardTitle className="text-lg">{currentQuestion.text}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {currentQuestion.type === 'abcd_grade' && (
                                <div className="space-y-4">
                                    {relevantMappings.map((mapping) => (
                                        <div key={mapping._id} className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="font-medium">{mapping.teacher.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {mapping.subject.name}
                                                        {mapping.subject.code && ` (${mapping.subject.code})`}
                                                        <Badge variant="outline" className="ml-2">
                                                            {typeLabels[mapping.teachingType]}
                                                        </Badge>
                                                    </p>
                                                </div>
                                            </div>
                                            <RadioGroup
                                                value={responses[currentQuestion._id]?.teacherResponses?.[mapping._id] || ''}
                                                onValueChange={(value) => handleGradeChange(mapping._id, value)}
                                                className="flex gap-4"
                                            >
                                                {gradeOptions.map((option) => (
                                                    <div key={option.value} className="flex items-center space-x-2">
                                                        <RadioGroupItem value={option.value} id={`${mapping._id}-${option.value}`} />
                                                        <Label
                                                            htmlFor={`${mapping._id}-${option.value}`}
                                                            className="cursor-pointer"
                                                        >
                                                            <span className="font-medium">{option.label}</span>
                                                            <span className="text-xs text-muted-foreground ml-1">({option.points})</span>
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {currentQuestion.type === 'text' && (
                                <Textarea
                                    placeholder="Enter your response (optional)..."
                                    value={responses[currentQuestion._id]?.textResponse || ''}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    rows={4}
                                />
                            )}

                            {currentQuestion.type === 'yes_no' && (
                                <RadioGroup
                                    value={
                                        responses[currentQuestion._id]?.yesNoResponse === true ? 'yes' :
                                            responses[currentQuestion._id]?.yesNoResponse === false ? 'no' : ''
                                    }
                                    onValueChange={(value) => handleYesNoChange(value === 'yes')}
                                    className="flex gap-6"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="yes" />
                                        <Label htmlFor="yes" className="cursor-pointer">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="no" />
                                        <Label htmlFor="no" className="cursor-pointer">No</Label>
                                    </div>
                                </RadioGroup>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Navigation */}
                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                    >
                        Previous
                    </Button>

                    {currentQuestionIndex < questions.length - 1 ? (
                        <Button
                            onClick={handleNext}
                            disabled={!isQuestionComplete()}
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={!isQuestionComplete() || isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
