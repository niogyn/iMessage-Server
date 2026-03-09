import React from 'react';
import { Box, Spinner } from '@chakra-ui/react';
import { BsCheckAll } from 'react-icons/bs';
import { RiErrorWarningLine } from 'react-icons/ri';
import { ProgressStatus } from '../../types';

interface OauthStatusIconProps {
    status: ProgressStatus;
}

export const OauthStatusIcon = ({ status }: OauthStatusIconProps): JSX.Element | null => {
    if (status === ProgressStatus.IN_PROGRESS) {
        return (
            <Box pt={3} pl={2}>
                <Spinner size='md' speed='0.65s' />
            </Box>
        );
    } else if (status === ProgressStatus.COMPLETED) {
        return (
            <Box pt={3} pl={2}>
                <BsCheckAll size={24} color='green' />
            </Box>
        );
    } else if (status === ProgressStatus.FAILED) {
        return (
            <Box pt={3} pl={2}>
                <RiErrorWarningLine size={24} />
            </Box>
        );
    }

    return null;
};
