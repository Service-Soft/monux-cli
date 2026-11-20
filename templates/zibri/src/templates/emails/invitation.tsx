import { $ts, InvitationEmailTemplate, MjButton, MjColumn, MjSection, MjText } from 'zibri';

import { BaseEmail } from '../email-components/base-email';
import { BaseEmailFooter } from '../email-components/base-email-footer';
import { BaseEmailHeader } from '../email-components/base-email-header';
import { EmailWrapper } from '../email-components/email-wrapper';

// the mail of an invitation, see the INVITATION_OPTIONS in providers.ts. The link opens the page of the admin app
// that accepts it
export const InvitationEmail: InvitationEmailTemplate = ({ link, tenant }) => {
    return (
        <BaseEmail title={$ts`Invitation`}>
            <EmailWrapper backgroundColor='#1a1a26' borderRadius='5px' boxShadow='0 0 8px 4px rgba(0, 0, 0, 0.15)'>
                <BaseEmailHeader>{$ts`Invitation`}</BaseEmailHeader>

                <MjSection paddingBottom='0px'>
                    <MjColumn>
                        <MjText paddingBottom='10px'>{$ts`Hello,`}</MjText>
                        <MjText paddingBottom='25px'>
                            {tenant == undefined
                                ? $ts`You were invited to create an account.`
                                : $ts`You were invited to join ${tenant.name}.`}
                        </MjText>
                        <MjButton href={link} cssClass='btn-primary'>
                            {$ts`Accept the invitation`}
                        </MjButton>
                        <MjText paddingTop='25px'>
                            {$ts`If you don't know what this is about, you can ignore this mail.`}
                        </MjText>
                    </MjColumn>
                </MjSection>

                <BaseEmailFooter />
            </EmailWrapper>
        </BaseEmail>
    );
};
