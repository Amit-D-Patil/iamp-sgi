'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Mapping {
    _id: string;
    teacher: { _id: string; name: string; shortName: string };
    subject: { _id: string; name: string; code?: string };
    class: { _id: string; displayName: string };
    teachingType: 'theory' | 'practical' | 'sla';
}

interface ApplicableTypes {
    theory: boolean;
    practical: boolean;
    sla: boolean;
}

interface IAMPPoint {
    _id: string;
    name: string;
    description?: string;
    applicableTypes?: ApplicableTypes;
    isActive: boolean;
}

interface Semester {
    _id: string;
    name: string;
    isActive: boolean;
}

interface Supervision {
    _id: string;
    iampPoint: { _id: string; name: string };
    status: 'yes' | 'no' | 'na';
}

export default function SupervisionPage() {
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [allIampPoints, setAllIampPoints] = useState<IAMPPoint[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [supervisions, setSupervisions] = useState<Supervision[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);

    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedMapping, setSelectedMapping] = useState<string>('');

    const selectedMappingData = mappings.find((m) => m._id === selectedMapping);

    // Filter IAMP points based on selected mapping's teaching type
    const filteredIampPoints = allIampPoints.filter((point) => {
        if (!selectedMappingData) return true;
        const types = point.applicableTypes || { theory: true, practical: true, sla: true };

        switch (selectedMappingData.teachingType) {
            case 'theory':
                return types.theory;
            case 'practical':
                return types.practical;
            case 'sla':
                return types.sla;
            default:
                return true;
        }
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedSemester && selectedMapping && selectedMappingData) {
            fetchSupervisions();
        } else {
            setSupervisions([]);
        }
    }, [selectedSemester, selectedMapping, selectedMappingData]);

    const fetchInitialData = async () => {
        try {
            const [mappingsRes, pointsRes, semestersRes] = await Promise.all([
                fetch('/api/teacher-mappings'),
                fetch('/api/iamp-points'),
                fetch('/api/semesters'),
            ]);
            const mappingsData = await mappingsRes.json();
            const pointsData = await pointsRes.json();
            const semestersData = await semestersRes.json();

            setMappings(mappingsData.mappings || []);
            setAllIampPoints(
                pointsData.points?.filter((p: IAMPPoint) => p.isActive) || []
            );
            setSemesters(
                semestersData.semesters?.filter((s: Semester) => s.isActive) || []
            );
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSupervisions = async () => {
        if (!selectedMappingData) return;
        try {
            const res = await fetch(
                `/api/supervisions?teacher=${selectedMappingData.teacher._id}&subject=${selectedMappingData.subject._id}&class=${selectedMappingData.class._id}&semester=${selectedSemester}`
            );
            const data = await res.json();
            setSupervisions(data.supervisions || []);
        } catch (error) {
            console.error('Error fetching supervisions:', error);
        }
    };

    const handleMark = async (iampPointId: string, status: 'yes' | 'no' | 'na') => {
        if (!selectedMappingData) return;
        setIsSaving(iampPointId);
        try {
            await fetch('/api/supervisions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacher: selectedMappingData.teacher._id,
                    subject: selectedMappingData.subject._id,
                    classId: selectedMappingData.class._id,
                    iampPoint: iampPointId,
                    semester: selectedSemester,
                    status,
                }),
            });
            await fetchSupervisions();
        } catch (error) {
            console.error('Error saving supervision:', error);
        } finally {
            setIsSaving(null);
        }
    };

    const getStatus = (iampPointId: string): 'yes' | 'no' | 'na' | null => {
        const supervision = supervisions.find(
            (s) => s.iampPoint._id === iampPointId
        );
        return supervision?.status || null;
    };

    const getStatusBadge = (status: 'yes' | 'no' | 'na' | null) => {
        if (!status) return null;

        const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
            yes: 'default',
            no: 'destructive',
            na: 'secondary',
        };

        const labels: Record<string, string> = {
            yes: 'Yes',
            no: 'No',
            na: 'N/A',
        };

        return (
            <Badge variant={variants[status]}>
                {labels[status]}
            </Badge>
        );
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            theory: 'TH',
            practical: 'PR',
            sla: 'SLA',
        };
        return labels[type] || type;
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Supervision</h1>

            {/* No semesters warning */}
            {semesters.length === 0 && (
                <Card className="mb-6 border-yellow-500">
                    <CardContent className="py-4">
                        <p className="text-center text-yellow-600">
                            No active semesters found. Please contact admin to create semesters.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* No mappings warning */}
            {mappings.length === 0 && (
                <Card className="mb-6 border-yellow-500">
                    <CardContent className="py-4">
                        <p className="text-center text-yellow-600">
                            No teacher mappings found. Please add teacher mappings in the Teachers page first.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Selection */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg">Select Semester & Teacher-Subject Mapping</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Semester</Label>
                            <Select
                                value={selectedSemester}
                                onValueChange={setSelectedSemester}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a semester" />
                                </SelectTrigger>
                                <SelectContent>
                                    {semesters.map((semester) => (
                                        <SelectItem key={semester._id} value={semester._id}>
                                            {semester.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Teacher - Subject - Class</Label>
                            <Select
                                value={selectedMapping}
                                onValueChange={setSelectedMapping}
                                disabled={!selectedSemester}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a mapping" />
                                </SelectTrigger>
                                <SelectContent>
                                    {mappings.map((mapping) => (
                                        <SelectItem key={mapping._id} value={mapping._id}>
                                            {mapping.teacher.name} - {mapping.subject.name} - {mapping.class.displayName} ({getTypeLabel(mapping.teachingType)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {selectedMappingData && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                            <div className="flex flex-wrap gap-2 text-sm">
                                <Badge variant="outline">Teacher: {selectedMappingData.teacher.name}</Badge>
                                <Badge variant="outline">Subject: {selectedMappingData.subject.name}</Badge>
                                <Badge variant="outline">Class: {selectedMappingData.class.displayName}</Badge>
                                <Badge>{getTypeLabel(selectedMappingData.teachingType)}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Showing only IAMP points applicable for {getTypeLabel(selectedMappingData.teachingType)}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* IAMP Points */}
            {selectedSemester && selectedMapping ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            IAMP Points
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({filteredIampPoints.length} applicable)
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredIampPoints.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">
                                No IAMP points found for this type
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {filteredIampPoints.map((point) => {
                                    const status = getStatus(point._id);
                                    const saving = isSaving === point._id;

                                    return (
                                        <div
                                            key={point._id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium">{point.name}</p>
                                                {point.description && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {point.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(status)}
                                                <Button
                                                    size="sm"
                                                    variant={status === 'yes' ? 'default' : 'outline'}
                                                    onClick={() => handleMark(point._id, 'yes')}
                                                    disabled={saving}
                                                >
                                                    Yes
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={status === 'no' ? 'destructive' : 'outline'}
                                                    onClick={() => handleMark(point._id, 'no')}
                                                    disabled={saving}
                                                >
                                                    No
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={status === 'na' ? 'secondary' : 'outline'}
                                                    onClick={() => handleMark(point._id, 'na')}
                                                    disabled={saving}
                                                >
                                                    N/A
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-8">
                        <p className="text-muted-foreground text-center">
                            Please select a semester and teacher-subject mapping to start supervision
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
