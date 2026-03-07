import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Text } from "@/src/components/ui/text";
import { cn } from "@/src/lib/utils";
import { queryKeys } from "@/src/services/queryKeys";
import { createVehicle } from "@/src/services/vehicle.service";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { Modal, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type VehicleType = "voiture" | "moto";

const COLORS = [
  "Noir",
  "Blanc",
  "Gris",
  "Rouge",
  "Bleu",
  "Vert",
  "Jaune",
  "Orange",
  "Marron",
  "Beige",
];

const COLOR_HEX: Record<string, string> = {
  Noir: "#1f2937",
  Blanc: "#f9fafb",
  Gris: "#9ca3af",
  Rouge: "#ef4444",
  Bleu: "#3b82f6",
  Vert: "#22c55e",
  Jaune: "#eab308",
  Orange: "#f97316",
  Marron: "#92400e",
  Beige: "#d4b896",
};

type VehicleFormValues = {
  vehicleType: VehicleType | "";
  maximumPassenger: number;
  vehicleName: string;
  year: string;
  plateNumber: string;
  color: string;
  licenseNumber: string;
  licensePhoto: string;
  permitPhotoBack: string;
  identityPhoto: string;
};

const ManageVehicleScreen = () => {
  const [currentStep, setCurrentStep] = React.useState<number>(0);
  const [furthestUnlockedStep, setFurthestUnlockedStep] =
    React.useState<number>(0);
  const [yearPickerOpen, setYearPickerOpen] = React.useState(false);
  const [yearDate, setYearDate] = React.useState(new Date());

  const {
    control,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    defaultValues: {
      vehicleType: "",
      maximumPassenger: 0,
      vehicleName: "",
      year: "",
      plateNumber: "",
      color: "",
      licenseNumber: "",
      licensePhoto: "",
      permitPhotoBack: "",
      identityPhoto: "",
    },
    mode: "onChange",
  });

  const vehicleType = watch("vehicleType");
  const maxPassenger = watch("maximumPassenger");
  const uploadedLicensePhoto = watch("licensePhoto");
  const uploadedPermitPhotoBack = watch("permitPhotoBack");
  const uploadedIdentityPhoto = watch("identityPhoto");

  const isMoto = vehicleType === "moto";

  const steps = React.useMemo(() => {
    const base = [
      { id: 0, label: "Infos", icon: "information-circle-outline" },
      { id: 1, label: "Véhicule", icon: isMoto ? "bicycle-outline" : "car-sport-outline" },
    ];
    if (!isMoto) {
      base.push({ id: 2, label: "Permis", icon: "document-text-outline" });
    }
    return base;
  }, [isMoto]);

  React.useEffect(() => {
    if (!vehicleType) {
      setValue("maximumPassenger", 0);
      return;
    }
    setValue("maximumPassenger", vehicleType === "moto" ? 1 : 4, {
      shouldValidate: true,
    });
  }, [setValue, vehicleType]);

  const fieldsByStep: (keyof VehicleFormValues)[][] = isMoto
    ? [
        ["vehicleType", "maximumPassenger"],
        ["vehicleName", "color"],
      ]
    : [
        ["vehicleType", "maximumPassenger"],
        ["vehicleName", "year", "plateNumber", "color"],
        ["licenseNumber", "licensePhoto", "permitPhotoBack", "identityPhoto"],
      ];

  const validatePreviousSteps = async (
    targetStep: number,
  ): Promise<boolean> => {
    for (let stepIndex = 0; stepIndex < targetStep; stepIndex += 1) {
      const isValid = await trigger(fieldsByStep[stepIndex]);
      if (!isValid) {
        setCurrentStep(stepIndex);
        return false;
      }
    }
    return true;
  };

  const goToNextStep = async (): Promise<void> => {
    const isValid = await trigger(fieldsByStep[currentStep]);
    if (!isValid) return;
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setFurthestUnlockedStep((prev) => Math.max(prev, nextStep));
    }
  };

  const goToPreviousStep = (): void => {
    if (currentStep === 0) {
      router.back();
      return;
    }
    setCurrentStep((prev) => prev - 1);
  };

  const goToStep = async (targetStep: number): Promise<void> => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    if (targetStep > furthestUnlockedStep + 1) return;
    const canNavigate = await validatePreviousSteps(targetStep);
    if (canNavigate) {
      setCurrentStep(targetStep);
      setFurthestUnlockedStep((prev) => Math.max(prev, targetStep));
    }
  };

  const onYearPickerChange = (e: DateTimePickerEvent, date?: Date) => {
    if (e.type === "dismissed") {
      setYearPickerOpen(false);
      return;
    }
    if (date) {
      setYearDate(date);
      setValue("year", String(date.getFullYear()), { shouldValidate: true });
      setYearPickerOpen(false);
    }
  };

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicules.all });
      router.back();
    },
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate({
      type: values.vehicleType as "voiture" | "moto",
      vehicleName: values.vehicleName,
      year: isMoto ? undefined : values.year,
      plateNumber: isMoto ? undefined : values.plateNumber,
      color: values.color || undefined,
      permitNumber: values.licenseNumber || undefined,
      permitPhoto: values.licensePhoto || undefined,
      permitPhotoBack: values.permitPhotoBack || undefined,
      identityPhoto: values.identityPhoto || undefined,
      maximumPassenger: values.maximumPassenger,
      default: false,
    });
  });

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-5 bg-primary pt-safe">
        <View className="flex-row justify-between items-center pt-3 mb-4">
          <TouchableOpacity onPress={goToPreviousStep}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">
            Ajouter un véhicule
          </Text>
          <TouchableOpacity className="opacity-0" disabled>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center p-1 rounded-2xl bg-white/15">
          {steps.map((step) => (
            <TouchableOpacity
              key={step.id}
              disabled={step.id > furthestUnlockedStep + 1}
              onPress={() => void goToStep(step.id)}
              className={cn(
                "flex-1 flex-row items-center justify-center rounded-xl py-2.5",
                step.id === currentStep && "bg-white",
                step.id > furthestUnlockedStep + 1 && "opacity-45",
              )}
            >
              <Ionicons
                name={step.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={step.id === currentStep ? "#0f172a" : "white"}
              />
              <Text
                className={cn(
                  "ml-1 text-xs font-semibold text-white",
                  step.id === currentStep && "text-slate-900",
                )}
              >
                {step.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-28 pt-5"
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 0 ? (
          <Animated.View entering={FadeInDown.duration(350)} className="gap-4">
            <Text className="text-base font-semibold text-foreground">
              Informations de base
            </Text>
            <Controller
              control={control}
              name="vehicleType"
              rules={{ required: "Choisissez un type de véhicule" }}
              render={({ field: { value, onChange } }) => (
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className={cn(
                      "flex-1 rounded-2xl border p-4",
                      value === "voiture"
                        ? "border-primary bg-primary/10"
                        : "border-gray bg-white",
                    )}
                    onPress={() => onChange("voiture")}
                  >
                    <Ionicons name="car-sport-outline" size={20} color="#0ea5e9" />
                    <Text className="mt-2 text-sm font-semibold">Voiture</Text>
                    <Text className="text-xs opacity-60">Max 4 passagers</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={cn(
                      "flex-1 rounded-2xl border p-4",
                      value === "moto"
                        ? "border-primary bg-primary/10"
                        : "border-gray bg-white",
                    )}
                    onPress={() => onChange("moto")}
                  >
                    <Ionicons name="bicycle-outline" size={20} color="#0ea5e9" />
                    <Text className="mt-2 text-sm font-semibold">Moto</Text>
                    <Text className="text-xs opacity-60">Max 1 passager</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.vehicleType ? (
              <Text className="text-xs text-red-500">
                {errors.vehicleType.message}
              </Text>
            ) : null}
            <View className="p-4 rounded-2xl border border-primary/20 bg-primary/10">
              <Text className="text-xs text-muted-foreground">
                Nombre maximum autorisé
              </Text>
              <Text className="mt-1 text-2xl font-bold">{maxPassenger}</Text>
            </View>
          </Animated.View>
        ) : null}

        {currentStep === 1 ? (
          <Animated.View entering={FadeInDown.duration(350)} className="gap-4">
            <Text className="text-base font-semibold text-foreground">
              Détails du véhicule
            </Text>

            <Controller
              control={control}
              name="vehicleName"
              rules={{ required: "Le nom du véhicule est requis" }}
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">
                    {isMoto ? "Nom de la moto" : "Nom de la voiture"}
                  </Text>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="Ex: Toyota Corolla"
                  />
                  {errors.vehicleName ? (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.vehicleName.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            {!isMoto ? (
              <>
                <Controller
                  control={control}
                  name="year"
                  rules={{
                    required: "L'année est requise",
                    pattern: {
                      value: /^(19|20)\d{2}$/,
                      message: "Année invalide (ex: 2022)",
                    },
                  }}
                  render={({ field: { value } }) => (
                    <View>
                      <Text className="mb-1 text-xs text-muted-foreground">
                        Année
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setYearDate(value ? new Date(parseInt(value, 10), 0) : new Date());
                          setYearPickerOpen(true);
                        }}
                        className="flex-row justify-between items-center p-4 rounded-xl border border-gray bg-white"
                      >
                        <Text className="text-sm">
                          {value ? value : "Choisir l'année"}
                        </Text>
                        <Ionicons name="calendar-outline" size={18} color="#64748b" />
                      </TouchableOpacity>
                      {errors.year ? (
                        <Text className="mt-1 text-xs text-red-500">
                          {errors.year.message}
                        </Text>
                      ) : null}
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="plateNumber"
                  rules={{ required: "Le numéro de matriculation est requis" }}
                  render={({ field: { onChange, value } }) => (
                    <View>
                      <Text className="mb-1 text-xs text-muted-foreground">
                        Numéro de matriculation
                      </Text>
                      <Input
                        value={value}
                        onChangeText={onChange}
                        placeholder="Ex: BK-1234-AA"
                      />
                      {errors.plateNumber ? (
                        <Text className="mt-1 text-xs text-red-500">
                          {errors.plateNumber.message}
                        </Text>
                      ) : null}
                    </View>
                  )}
                />
              </>
            ) : null}

            <Controller
              control={control}
              name="color"
              rules={{ required: "La couleur est requise" }}
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">
                    Couleur
                  </Text>
                  <Select
                    value={value ? { value, label: value } : undefined}
                    onValueChange={(opt) => onChange(opt?.value ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <View className="flex-row items-center gap-2">
                        {value ? (
                          <View
                            className="size-4 rounded-full border border-gray-300"
                            style={{
                              backgroundColor: COLOR_HEX[value] ?? "#9ca3af",
                            }}
                          />
                        ) : null}
                        <SelectValue placeholder="Choisir une couleur" />
                      </View>
                    </SelectTrigger>
                    <SelectContent className="mt-2 w-[91%]">
                      {COLORS.map((c) => (
                        <SelectItem key={c} label={c} value={c}>
                          <View
                            className="mr-2 size-4 rounded-full border border-gray-300"
                            style={{
                              backgroundColor: COLOR_HEX[c] ?? "#9ca3af",
                            }}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.color ? (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.color.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            {isMoto ? (
              <Controller
                control={control}
                name="identityPhoto"
                render={({ field: { value, onChange } }) => (
                  <View>
                    <Text className="mb-1 text-xs text-muted-foreground">
                      Photo d'identité (optionnel)
                    </Text>
                    <TouchableOpacity
                      className="flex-row justify-between items-center p-4 rounded-xl border border-dashed border-gray"
                      onPress={() => {
                        if (value) onChange("");
                        else onChange("identity_photo_01.jpg");
                      }}
                    >
                      <View className="flex-row items-center">
                        <Ionicons
                          name={
                            value
                              ? "checkmark-circle-outline"
                              : "cloud-upload-outline"
                          }
                          size={18}
                          color={value ? "#10b981" : "#6366f1"}
                        />
                        <Text className="ml-2 text-sm">
                          {value ? value : "Uploader (optionnel)"}
                        </Text>
                      </View>
                      <Text className="text-xs font-semibold text-primary">
                        {value ? "Retirer" : "Uploader"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            ) : null}
          </Animated.View>
        ) : null}

        {currentStep === 2 && !isMoto ? (
          <Animated.View entering={FadeInDown.duration(350)} className="gap-4">
            <Text className="text-base font-semibold text-foreground">
              Permis
            </Text>

            <Controller
              control={control}
              name="licenseNumber"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">
                    Numéro permis
                  </Text>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="Ex: ML-2024-00981"
                  />
                </View>
              )}
            />

            <Controller
              control={control}
              name="licensePhoto"
              render={({ field: { value, onChange } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">
                    Photo de permis (Recto)
                  </Text>
                  <TouchableOpacity
                    className="flex-row justify-between items-center p-4 rounded-xl border border-dashed border-gray"
                    onPress={() => {
                      if (value) onChange("");
                      else onChange("permis_photo_01.jpg");
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={
                          value
                            ? "checkmark-circle-outline"
                            : "cloud-upload-outline"
                        }
                        size={18}
                        color={value ? "#10b981" : "#6366f1"}
                      />
                      <Text className="ml-2 text-sm">
                        {value ? value : "Uploader votre photo"}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-primary">
                      {value ? "Retirer" : "Uploader"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            <Controller
              control={control}
              name="permitPhotoBack"
              render={({ field: { value, onChange } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">
                    Photo de permis (Verso)
                  </Text>
                  <TouchableOpacity
                    className="flex-row justify-between items-center p-4 rounded-xl border border-dashed border-gray"
                    onPress={() => {
                      if (value) onChange("");
                      else onChange("permis_verso_01.jpg");
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={
                          value
                            ? "checkmark-circle-outline"
                            : "cloud-upload-outline"
                        }
                        size={18}
                        color={value ? "#10b981" : "#6366f1"}
                      />
                      <Text className="ml-2 text-sm">
                        {value ? value : "Uploader votre photo"}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-primary">
                      {value ? "Retirer" : "Uploader"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            <Controller
              control={control}
              name="identityPhoto"
              render={({ field: { value, onChange } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">
                    Photo d'identité
                  </Text>
                  <TouchableOpacity
                    className="flex-row justify-between items-center p-4 rounded-xl border border-dashed border-gray"
                    onPress={() => {
                      if (value) onChange("");
                      else onChange("identity_photo_01.jpg");
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={
                          value
                            ? "checkmark-circle-outline"
                            : "cloud-upload-outline"
                        }
                        size={18}
                        color={value ? "#10b981" : "#6366f1"}
                      />
                      <Text className="ml-2 text-sm">
                        {value ? value : "Uploader votre photo"}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-primary">
                      {value ? "Retirer" : "Uploader"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            <View className="p-4 rounded-2xl border border-primary/20 bg-primary/10">
              <Text className="text-xs text-muted-foreground">Récapitulatif</Text>
              <Text className="mt-1 text-sm">Type: Voiture</Text>
              <Text className="text-sm">Max passagers: {maxPassenger}</Text>
              <Text className="text-sm">
                Photo permis recto: {uploadedLicensePhoto ? "Ajoutée" : "Non ajoutée"}
              </Text>
              <Text className="text-sm">
                Photo permis verso: {uploadedPermitPhotoBack ? "Ajoutée" : "Non ajoutée"}
              </Text>
              <Text className="text-sm">
                Photo d'identité: {uploadedIdentityPhoto ? "Ajoutée" : "Non ajoutée"}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View className="absolute right-0 bottom-0 left-0 px-5 pt-3 pb-5 bg-white border-t border-gray">
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onPress={goToPreviousStep}
          >
            <Text>{currentStep === 0 ? "Retour" : "Précédent"}</Text>
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button className="flex-1 rounded-xl" onPress={() => void goToNextStep()}>
              <Text>Continuer</Text>
            </Button>
          ) : (
            <Button className="flex-1 rounded-xl" onPress={onSubmit}>
              <Text>Ajouter le véhicule</Text>
            </Button>
          )}
        </View>
      </View>

      {yearPickerOpen && (
        <Modal transparent visible animationType="fade">
          <View className="flex-1 justify-center items-center px-6 bg-black/40">
            <View className="p-4 w-full max-w-md bg-white rounded-2xl">
              <Text className="mb-2 text-base font-semibold text-center">
                Choisir l'année
              </Text>
              <DateTimePicker
                mode="date"
                value={yearDate}
                onChange={onYearPickerChange}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                minimumDate={new Date(1990, 0, 1)}
              />
              {Platform.OS === "android" ? null : (
                <Button
                  variant="outline"
                  className="mt-3 rounded-xl"
                  onPress={() => setYearPickerOpen(false)}
                >
                  <Text>Fermer</Text>
                </Button>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default ManageVehicleScreen;
