import React from 'react';
import { Alert, AlertIcon, Text } from '@chakra-ui/react';
import { ProgressStatus } from '../../types';

interface FcmStatusAlertProps {
    authStatus: ProgressStatus;
    projectId?: string | null;
}

export const FcmStatusAlert = ({ authStatus, projectId }: FcmStatusAlertProps): JSX.Element => {
    if (authStatus === ProgressStatus.COMPLETED) {
        return (
            <Alert status='success'>
                <AlertIcon />
                <Text>
                    Firebase notifications are configured!
                    {projectId && <>{' '}Project: <b>{projectId}</b></>}
                </Text>
            </Alert>
        );
    }

    return (
        <Alert status='warning'>
            <AlertIcon />
            Firebase is not configured! Failing to configure Firebase Notifications will
            prevent notifications from being delivered to your Android device.
        </Alert>
    );
};
