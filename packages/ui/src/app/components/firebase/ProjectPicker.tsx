import React from 'react';
import { Button, Select, Stack, Text } from '@chakra-ui/react';

interface ProjectPickerProps {
    projects: Array<{ projectId: string; displayName: string }>;
    selectedProject: string;
    onSelect: (projectId: string) => void;
    onConfigure: () => void;
    isDisabled?: boolean;
}

export const ProjectPicker = ({
    projects,
    selectedProject,
    onSelect,
    onConfigure,
    isDisabled = false
}: ProjectPickerProps): JSX.Element => (
    <Stack spacing={4} mt={4}>
        {projects.length === 0 ? (
            <Text fontSize='sm' color='gray.500'>No Firebase projects found for this account.</Text>
        ) : (
            <>
                <Select
                    placeholder='Select a Firebase project'
                    value={selectedProject}
                    onChange={(e) => onSelect(e.target.value)}
                >
                    {projects.map(p => (
                        <option key={p.projectId} value={p.projectId}>
                            {p.displayName} ({p.projectId})
                        </option>
                    ))}
                </Select>
                <Button
                    colorScheme='blue'
                    isDisabled={!selectedProject || isDisabled}
                    onClick={onConfigure}
                >
                    Configure Project
                </Button>
            </>
        )}
    </Stack>
);
