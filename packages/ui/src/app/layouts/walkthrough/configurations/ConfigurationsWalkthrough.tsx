import React from 'react';
import {
    Box,
    Divider,
    Flex,
    Icon,
    List,
    ListIcon,
    ListItem,
    Text,
    SlideFade,
} from '@chakra-ui/react';
import { BsCheckCircleFill, BsExclamationCircleFill } from 'react-icons/bs';
import { AutoStartMethodField } from '../../../components/fields/AutoStartMethodField';
import { AutoCaffeinateField } from '../../../components/fields/AutoCaffeinateField';
import { CheckForUpdatesField } from '../../../components/fields/CheckForUpdatesField';
import { UseOledDarkModeField } from '../../../components/fields/OledDarkThemeField';
import { OpenFindMyOnStartupField } from 'app/components/fields/OpenFindMyOnStartupField';
import { useAppSelector } from '../../../hooks';

const SetupStatusItem = ({ label, isConfigured }: { label: string; isConfigured: boolean }) => (
    <ListItem>
        <Flex alignItems='center'>
            <ListIcon
                as={isConfigured ? BsCheckCircleFill : BsExclamationCircleFill}
                color={isConfigured ? 'green.500' : 'orange.400'}
            />
            <Text>{label}: {isConfigured ? 'Configured' : 'Not Configured'}</Text>
        </Flex>
    </ListItem>
);

export const ConfigurationsWalkthrough = (): JSX.Element => {
    const fcmConfigured = useAppSelector(state =>
        state.config.fcm_client !== null && state.config.fcm_server !== null
    );
    const password = useAppSelector(state => state.config.password ?? '');
    const proxyService = useAppSelector(state => state.config.proxy_service ?? '');
    const privateApiEnabled = useAppSelector(state => state.config.enable_private_api ?? false);

    return (
        <SlideFade in={true} offsetY='150px'>
            <Box px={5}>
                <Text fontSize='4xl'>Setup Complete!</Text>
                <Text fontSize='md' mt={5}>
                    Congratulations, you have completed the BlueBubbles Server setup! Here are some useful features that
                    you may want to checkout to customize your BlueBubbles experience!
                </Text>

                <Text fontSize='3xl' mt={5}>Setup Summary</Text>
                <Divider mb={3} />
                <List spacing={2}>
                    <SetupStatusItem
                        label="Firebase / FCM"
                        isConfigured={fcmConfigured}
                    />
                    <SetupStatusItem
                        label="Server Password"
                        isConfigured={password.length > 0}
                    />
                    <SetupStatusItem
                        label="Proxy Service"
                        isConfigured={proxyService.length > 0}
                    />
                    <SetupStatusItem
                        label="Private API (optional)"
                        isConfigured={privateApiEnabled as boolean}
                    />
                </List>

                <Text fontSize='3xl' mt={5}>Features</Text>
                <Box my={3} />
                <OpenFindMyOnStartupField />
                <Box my={3} />
                <AutoStartMethodField />
                <Box my={3} />
                <AutoCaffeinateField />
                <Text fontSize='3xl' mt={5}>Update Settings</Text>
                <Box my={3} />
                <CheckForUpdatesField />
                <Text fontSize='3xl' mt={5}>Theme Settings</Text>
                <Box my={3} />
                <UseOledDarkModeField />
            </Box>
        </SlideFade>
    );
};