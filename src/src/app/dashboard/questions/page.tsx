'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface Question {
    _id: string;
    text: string;
    type: 'abcd_grade' | 'text' | 'yes_no';
    category?: string;
    order: number;
    isActive: boolean;
    isRequired: boolean;
    createdAt: string;
}

const typeLabels: Record<string, string> = {
    abcd_grade: 'Grade (A/B/C/D)',
    text: 'Text Response',
    yes_no: 'Yes / No',
};

export default function QuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
        text: '',
        type: 'abcd_grade' as 'abcd_grade' | 'text' | 'yes_no',
        category: '',
        isRequired: false,
    });

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const res = await fetch('/api/questions');
            const data = await res.json();
            setQuestions(data.questions || []);
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsOpen(false);
                setFormData({ text: '', type: 'abcd_grade', category: '', isRequired: false });
                fetchQuestions();
            } else {
                const data = await res.json();
                alert(data.error || 'Error creating question');
            }
        } catch (error) {
            console.error('Error creating question:', error);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/questions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            fetchQuestions();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const deleteQuestion = async (id: string) => {
        if (!confirm('Are you sure you want to delete this question?')) return;
        try {
            await fetch(`/api/questions/${id}`, { method: 'DELETE' });
            fetchQuestions();
        } catch (error) {
            console.error('Error deleting question:', error);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Feedback Questions</h1>
                    <p className="text-muted-foreground text-sm">
                        Manage questions for student feedback forms
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Question</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Question</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="text">Question Text</Label>
                                <Input
                                    id="text"
                                    value={formData.text}
                                    onChange={(e) =>
                                        setFormData({ ...formData, text: e.target.value })
                                    }
                                    placeholder="e.g., How would you rate the teaching quality?"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Response Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value: 'abcd_grade' | 'text' | 'yes_no') =>
                                        setFormData({ ...formData, type: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="abcd_grade">Grade (A/B/C/D)</SelectItem>
                                        <SelectItem value="text">Text Response</SelectItem>
                                        <SelectItem value="yes_no">Yes / No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category (Optional)</Label>
                                <Input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData({ ...formData, category: e.target.value })
                                    }
                                    placeholder="e.g., Teaching, Course Content, Infrastructure"
                                />
                            </div>
                            {formData.type === 'text' && (
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <Label htmlFor="isRequired">Required</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Students must answer this question
                                        </p>
                                    </div>
                                    <Switch
                                        id="isRequired"
                                        checked={formData.isRequired}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, isRequired: checked })
                                        }
                                    />
                                </div>
                            )}
                            <Button type="submit" className="w-full" disabled={!formData.text}>
                                Create Question
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {questions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    No questions found. Add your first question.
                                </TableCell>
                            </TableRow>
                        ) : (
                            questions.map((question, index) => (
                                <TableRow key={question._id}>
                                    <TableCell className="font-medium text-muted-foreground">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <p className="line-clamp-2">{question.text}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                            <Badge variant="outline">{typeLabels[question.type]}</Badge>
                                            {question.type === 'text' && question.isRequired && (
                                                <Badge variant="destructive">Required</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {question.category ? (
                                            <Badge variant="secondary">{question.category}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={question.isActive ? 'default' : 'secondary'}>
                                            {question.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={question.isActive}
                                            onCheckedChange={() => toggleStatus(question._id, question.isActive)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => deleteQuestion(question._id)}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {questions.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Question Types & Scoring:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Grade (A/B/C/D)</strong>: A = 10 pts, B = 7.5 pts, C = 5 pts, D = 2.5 pts</li>
                        <li>• <strong>Text Response</strong>: Students write a free-form answer (not scored)</li>
                        <li>• <strong>Yes / No</strong>: Students select Yes or No</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
