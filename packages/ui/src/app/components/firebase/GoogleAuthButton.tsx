import React from 'react';
import { Button, Image, Link, Stack } from '@chakra-ui/react';
import { store } from '../../store';
import { filter as filterLogs } from '../../slices/LogsSlice';
import GoogleIcon from '../../../images/walkthrough/google-icon.png';

interface GoogleAuthButtonProps {
    oauthUrl: string;
    onClick: () => void;
}

export const GoogleAuthButton = ({ oauthUrl, onClick }: GoogleAuthButtonProps): JSX.Element => (
    <Link
        href={oauthUrl}
        target="_blank"
        _hover={{ textDecoration: 'none' }}
    >
        <Stack direction='row' alignItems='center'>
            <Button
                pl={10}
                pr={10}
                mt={3}
                leftIcon={<Image src={GoogleIcon} mr={1} width={5} />}
                variant='outline'
                onClick={() => {
                    onClick();
                    store.dispatch(filterLogs(item => !item.message.startsWith('[OauthService]')));
                }}
            >
                Continue with Google
            </Button>
        </Stack>
    </Link>
);
