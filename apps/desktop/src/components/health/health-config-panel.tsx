/// Health score configuration panel — sliders for penalty weights + attention threshold.
import { Button, Form, InputNumber, Slider, Spin, Typography, notification } from 'antd';
import { useEffect } from 'react';
import { useHealthConfig, useSaveHealthConfig } from '../../queries/use-health-query';
import type { HealthConfig } from '@devdock/types';

const { Text } = Typography;

interface WeightRowProps {
  name: keyof HealthConfig;
  label: string;
  max?: number;
}

function WeightRow({ name, label, max = 30 }: WeightRowProps) {
  return (
    <Form.Item label={label} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Form.Item name={name} noStyle>
          <Slider min={0} max={max} style={{ flex: 1 }} />
        </Form.Item>
        <Form.Item name={name} noStyle>
          <InputNumber min={0} max={max} style={{ width: 64 }} />
        </Form.Item>
      </div>
    </Form.Item>
  );
}

export function HealthConfigPanel() {
  const { data: config, isLoading } = useHealthConfig();
  const save = useSaveHealthConfig();
  const [form] = Form.useForm<HealthConfig>();

  useEffect(() => {
    if (config) form.setFieldsValue(config);
  }, [config, form]);

  async function handleSave() {
    const values = await form.validateFields();
    try {
      await save.mutateAsync(values);
      notification.success({ message: 'Health config saved' });
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  if (isLoading) return <Spin />;

  return (
    <div>
      <Text strong style={{ display: 'block', marginBottom: 16 }}>Health Score Weights</Text>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: 12 }}>
        Configure penalty points per issue. Score = 100 − total penalties (min 0).
      </Text>

      <Form form={form} layout="vertical">
        <WeightRow name="weight_deps_outdated" label="Outdated dependency (per dep, max −30)" />
        <WeightRow name="weight_vulnerability" label="Vulnerable dependency (per dep, max −30)" />
        <WeightRow name="weight_ci_failing" label="CI failing" max={40} />
        <WeightRow name="weight_stale_30d" label="No commit > 30 days" max={30} />
        <WeightRow name="weight_stale_90d" label="No commit > 90 days" max={40} />
        <WeightRow name="weight_uncommitted" label="Uncommitted changes > 10 files" />
        <WeightRow name="weight_no_remote" label="No git remote configured" max={15} />

        <Form.Item label="Attention threshold (projects below this score need attention)" name="attention_threshold" style={{ marginTop: 8 }}>
          <InputNumber min={0} max={100} />
        </Form.Item>

        <Button type="primary" onClick={handleSave} loading={save.isPending}>
          Save Configuration
        </Button>
      </Form>
    </div>
  );
}
