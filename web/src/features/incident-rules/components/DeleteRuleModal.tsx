import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { isDefaultRule } from '@/features/incident-rules/utils/iar-utils';

interface DeleteRuleModalProps {
  ruleName: string | undefined;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export const DeleteRuleModal: FC<DeleteRuleModalProps> = ({
  ruleName,
  isOpen,
  onClose,
  onDelete,
  isDeleting,
}) => {
  const { t } = useTranslation(process.env.I18N_NAMESPACE);

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      ouiaId="DeleteRuleModal"
      aria-labelledby="delete-rule-modal"
    >
      <ModalHeader
        titleIconVariant="warning"
        title={t('Permanently delete aggregation rule?')}
        labelId="delete-rule-modal-title"
      />
      <ModalBody id="delete-rule-modal-body">
        {t('Are you sure you want to delete ')}
        <strong>{ruleName}</strong>
        {t('? This action cannot be undone.')}
        {ruleName && isDefaultRule(ruleName) && (
          <p style={{ marginTop: '1rem' }}>
            <strong>
              {t(
                'This is a default rule. Deleting it may change how alerts are grouped into incidents.',
              )}
            </strong>
          </p>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          key="delete-rule-btn-delete"
          variant="danger"
          onClick={onDelete}
          isDisabled={!ruleName || isDeleting}
          isLoading={isDeleting}
        >
          {isDeleting ? t('Deleting...') : t('Delete')}
        </Button>
        <Button key="delete-rule-btn-cancel" variant="link" onClick={onClose}>
          {t('Cancel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
