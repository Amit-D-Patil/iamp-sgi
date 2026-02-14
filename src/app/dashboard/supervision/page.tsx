'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import DummyButton from '@/components/DummyButton';

interface MappingGroup {
    key: string;
    mappingId: string; // Store one mapping ID for remarks
    teacher: { _id: string; name: string; shortName: string };
    subject: { _id: string; name: string; code?: string };
    class: { _id: string; displayName: string };
    remarks?: string;
}

interface IAMPPoint {
    _id: string;
    name: string;
    description?: string;
    isActive: boolean;
}

interface Semester {
    _id: string;
    name: string;
    isActive: boolean;
}

interface Department {
    _id: string;
    name: string;
    shortName: string;
}

interface Supervision {
    _id: string;
    iampPoint: { _id: string; name: string };
    status: 'yes' | 'no' | 'na';
}

interface RawMapping {
    _id: string;
    teacher: { _id: string; name: string; shortName: string };
    subject: { _id: string; name: string; code?: string };
    class: { _id: string; displayName: string };
    teachingType: string;
    remarks?: string;
}

export default function SupervisionPage() {
    const [allMappingGroups, setAllMappingGroups] = useState<MappingGroup[]>([]); // All mappings
    const [mappingGroups, setMappingGroups] = useState<MappingGroup[]>([]); // Filtered by department
    const [departments, setDepartments] = useState<Department[]>([]);
    const [allIampPoints, setAllIampPoints] = useState<IAMPPoint[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [supervisions, setSupervisions] = useState<Supervision[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);

    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [selectedMapping, setSelectedMapping] = useState<string>('');

    // Remarks state
    const [remarks, setRemarks] = useState<string>('');
    const [isSavingRemarks, setIsSavingRemarks] = useState(false);
    const remarksTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const selectedMappingData = mappingGroups.find((m) => m.key === selectedMapping);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedSemester && selectedMapping && selectedMappingData) {
            fetchSupervisions();
        } else {
            setSupervisions([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSemester, selectedMapping, selectedMappingData]);

    // Filter mappings by selected department
    useEffect(() => {
        if (selectedDepartment) {
            // Filter mappings from all mappings based on department
            fetch(`/api/teacher-mappings?department=${selectedDepartment}`)
                .then(res => res.json())
                .then(data => {
                    const rawMappings: RawMapping[] = data.mappings || [];
                    const groupMap = new Map<string, MappingGroup>();

                    rawMappings.forEach((m) => {
                        if (!m.teacher?._id || !m.subject?._id || !m.class?._id) return;

                        const key = `${m.teacher._id}-${m.subject._id}-${m.class._id}`;
                        if (!groupMap.has(key)) {
                            groupMap.set(key, {
                                key,
                                mappingId: m._id,
                                teacher: m.teacher,
                                subject: m.subject,
                                class: m.class,
                                remarks: m.remarks || '',
                            });
                        }
                    });

                    setMappingGroups(Array.from(groupMap.values()));
                })
                .catch(error => console.error('Error filtering mappings:', error));

            // Reset mapping selection when department changes
            setSelectedMapping('');
        } else {
            setMappingGroups([]);
        }
    }, [selectedDepartment]);

    const fetchInitialData = async () => {
        try {
            const [mappingsRes, pointsRes, semestersRes, departmentsRes] = await Promise.all([
                fetch('/api/teacher-mappings?allDepartments=true'), // Get all departments' mappings
                fetch('/api/iamp-points'),
                fetch('/api/semesters'),
                fetch('/api/departments'),
            ]);
            const mappingsData = await mappingsRes.json();
            const pointsData = await pointsRes.json();
            const semestersData = await semestersRes.json();
            const departmentsData = await departmentsRes.json();

            // Group mappings by teacher-subject-class (ignore type)
            const rawMappings: RawMapping[] = mappingsData.mappings || [];
            const groupMap = new Map<string, MappingGroup>();

            rawMappings.forEach((m) => {
                // Skip mappings with missing data
                if (!m.teacher?._id || !m.subject?._id || !m.class?._id) return;

                const key = `${m.teacher._id}-${m.subject._id}-${m.class._id}`;
                if (!groupMap.has(key)) {
                    groupMap.set(key, {
                        key,
                        mappingId: m._id, // Store the mapping ID
                        teacher: m.teacher,
                        subject: m.subject,
                        class: m.class,
                        remarks: m.remarks || '',
                    });
                }
            });

            setAllMappingGroups(Array.from(groupMap.values())); // Store all mappings
            setDepartments(departmentsData.departments || []);
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
        if (!selectedMappingData || !selectedDepartment) return;
        try {
            const res = await fetch(
                `/api/supervisions?teacher=${selectedMappingData.teacher._id}&subject=${selectedMappingData.subject._id}&class=${selectedMappingData.class._id}&semester=${selectedSemester}&department=${selectedDepartment}`
            );
            const data = await res.json();
            setSupervisions(data.supervisions || []);
        } catch (error) {
            console.error('Error fetching supervisions:', error);
        }
    };

    const handleMark = async (iampPointId: string, status: 'yes' | 'no' | 'na') => {
        if (!selectedMappingData || !selectedDepartment) return;
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
                    department: selectedDepartment,
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

    // Save remarks to the server
    const saveRemarks = useCallback(async (mappingId: string, newRemarks: string, mappingKey: string) => {
        setIsSavingRemarks(true);
        try {
            await fetch(`/api/teacher-mappings/${mappingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remarks: newRemarks }),
            });
            // Update local state so remarks persist on reselection
            setMappingGroups(prev => prev.map(m =>
                m.key === mappingKey ? { ...m, remarks: newRemarks } : m
            ));
        } catch (error) {
            console.error('Error saving remarks:', error);
        } finally {
            setIsSavingRemarks(false);
        }
    }, []);

    // Handle remarks change with debounce
    const handleRemarksChange = (newRemarks: string) => {
        setRemarks(newRemarks);

        // Clear existing timeout
        if (remarksTimeoutRef.current) {
            clearTimeout(remarksTimeoutRef.current);
        }

        // Set new timeout to save after 1 second of inactivity
        if (selectedMappingData) {
            remarksTimeoutRef.current = setTimeout(() => {
                saveRemarks(selectedMappingData.mappingId, newRemarks, selectedMappingData.key);
            }, 1000);
        }
    };

    // Set remarks when mapping changes
    useEffect(() => {
        if (selectedMappingData) {
            setRemarks(selectedMappingData.remarks || '');
        } else {
            setRemarks('');
        }
        // Clear timeout on mapping change
        if (remarksTimeoutRef.current) {
            clearTimeout(remarksTimeoutRef.current);
        }
    }, [selectedMappingData]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (remarksTimeoutRef.current) {
                clearTimeout(remarksTimeoutRef.current);
            }
        };
    }, []);

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
            {mappingGroups.length === 0 && (
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
                    <CardTitle className="text-lg">Select Semester, Department & Teacher-Subject-Class</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <Label>Department</Label>
                            <Select
                                value={selectedDepartment}
                                onValueChange={setSelectedDepartment}
                                disabled={!selectedSemester}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept._id} value={dept._id}>
                                            {dept.name} ({dept.shortName})
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
                                disabled={!selectedSemester || !selectedDepartment}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a mapping" />
                                </SelectTrigger>
                                <SelectContent>
                                    {mappingGroups.map((mapping) => (
                                        <SelectItem key={mapping.key} value={mapping.key}>
                                            {mapping.teacher.name} - {mapping.subject.name} - {mapping.class.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {selectedMappingData && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                            <div className="flex flex-wrap gap-2 text-sm mb-3">
                                <Badge variant="outline">Teacher: {selectedMappingData.teacher.name}</Badge>
                                <Badge variant="outline">Subject: {selectedMappingData.subject.name}</Badge>
                                <Badge variant="outline">Class: {selectedMappingData.class.displayName}</Badge>
                            </div>

                            {/* Remarks textbox */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="remarks" className="text-sm font-medium">
                                        Remarks (for your reference only)
                                    </Label>
                                    {isSavingRemarks && (
                                        <span className="text-xs text-muted-foreground">Saving...</span>
                                    )}
                                </div>
                                <Textarea
                                    id="remarks"
                                    placeholder="Add notes about this teacher-subject mapping..."
                                    value={remarks}
                                    onChange={(e) => handleRemarksChange(e.target.value)}
                                    rows={2}
                                    className="text-sm bg-background"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Auto-saves after 1 second of inactivity
                                </p>
                                <DummyButton label='Save' />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* IAMC Points */}
            {selectedSemester && selectedMapping ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            IAMC Points
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {allIampPoints.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">
                                No active IAMC points found
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {allIampPoints.map((point) => {
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
                        <DummyButton className='w-full' label='Save' />
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-8">
                        <p className="text-muted-foreground text-center">
                            Please select a semester and teacher-subject-class to start supervision
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
