import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Text } from "@/src/components/ui/text";
import { cn } from "@/src/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type VehicleType = "voiture" | "moto";

type VehicleFormValues = {
  vehicleType: VehicleType | "";
  maximumPassenger: number;
  vehicleName: string;
  year: string;
  plateNumber: string;
  licenseNumber: string;
  licensePhoto: string;
};

const steps = [
  { id: 0, label: "Infos", icon: "information-circle-outline" },
  { id: 1, label: "Vehicule", icon: "car-sport-outline" },
  { id: 2, label: "Permis", icon: "document-text-outline" },
] as const;

const ManageVehicleScreen = () => {
  const [currentStep, setCurrentStep] = React.useState<number>(0);
  const [furthestUnlockedStep, setFurthestUnlockedStep] = React.useState<number>(0);

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
      licenseNumber: "",
      licensePhoto: "",
    },
    mode: "onChange",
  });

  const vehicleType = watch("vehicleType");
  const maxPassenger = watch("maximumPassenger");
  const uploadedPhoto = watch("licensePhoto");

  React.useEffect(() => {
    if (!vehicleType) {
      setValue("maximumPassenger", 0);
      return;
    }

    setValue("maximumPassenger", vehicleType === "moto" ? 1 : 6, {
      shouldValidate: true,
    });
  }, [setValue, vehicleType]);

  const fieldsByStep: Array<Array<keyof VehicleFormValues>> = [
    ["vehicleType", "maximumPassenger"],
    ["vehicleName", "year", "plateNumber"],
    ["licenseNumber"],
  ];

  const validatePreviousSteps = async (targetStep: number): Promise<boolean> => {
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

    if (!isValid) {
      return;
    }

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

    if (targetStep > furthestUnlockedStep + 1) {
      return;
    }

    const canNavigate = await validatePreviousSteps(targetStep);

    if (canNavigate) {
      setCurrentStep(targetStep);
      setFurthestUnlockedStep((prev) => Math.max(prev, targetStep));
    }
  };

  const onSubmit = handleSubmit(() => {
    router.back();
  });

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-5 pt-safe pb-5">
        <View className="mb-4 flex-row items-center justify-between pt-3">
          <TouchableOpacity onPress={goToPreviousStep}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Ajouter un vehicule</Text>
          <TouchableOpacity className="opacity-0" disabled>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center rounded-2xl bg-white/15 p-1">
          {steps.map((step) => (
            <TouchableOpacity
              key={step.id}
              disabled={step.id > furthestUnlockedStep + 1}
              onPress={() => {
                goToStep(step.id);
              }}
              className={cn(
                "flex-1 flex-row items-center justify-center rounded-xl py-2.5",
                step.id === currentStep && "bg-white",
                step.id > furthestUnlockedStep + 1 && "opacity-45",
              )}
            >
              <Ionicons
                name={step.icon}
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

            <Text className="text-xs text-muted-foreground">
              Type de vehicule
            </Text>

            <Controller
              control={control}
              name="vehicleType"
              rules={{ required: "Choisissez un type de vehicule" }}
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
                    <Text className="text-xs opacity-60">Max 6 passagers</Text>
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
              <Text className="text-xs text-red-500">{errors.vehicleType.message}</Text>
            ) : null}

            <View className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <Text className="text-xs text-muted-foreground">
                Nombre maximum autorise
              </Text>
              <Text className="mt-1 text-2xl font-bold">{maxPassenger}</Text>
            </View>
          </Animated.View>
        ) : null}

        {currentStep === 1 ? (
          <Animated.View entering={FadeInDown.duration(350)} className="gap-4">
            <Text className="text-base font-semibold text-foreground">
              Details du vehicule
            </Text>

            <Controller
              control={control}
              name="vehicleName"
              rules={{ required: "Le nom du vehicule est requis" }}
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">
                    Nom de la voiture
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

            <Controller
              control={control}
              name="year"
              rules={{
                required: "L annee est requise",
                pattern: {
                  value: /^(19|20)\d{2}$/,
                  message: "Entrez une annee valide (ex: 2022)",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">Annee</Text>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="Ex: 2022"
                    keyboardType="number-pad"
                  />
                  {errors.year ? (
                    <Text className="mt-1 text-xs text-red-500">{errors.year.message}</Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="plateNumber"
              rules={{ required: "Le numero de matriculation est requis" }}
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">
                    Numero de matriculation
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
          </Animated.View>
        ) : null}

        {currentStep === 2 ? (
          <Animated.View entering={FadeInDown.duration(350)} className="gap-4">
            <Text className="text-base font-semibold text-foreground">
              Informations du permis
            </Text>

            <Controller
              control={control}
              name="licenseNumber"
              rules={{ required: "Le numero permis est requis" }}
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">
                    Numero permis
                  </Text>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="Ex: ML-2024-00981"
                  />
                  {errors.licenseNumber ? (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.licenseNumber.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="licensePhoto"
              render={({ field: { value, onChange } }) => (
                <View>
                  <Text className="mb-1 text-xs text-muted-foreground">
                    Photo permis (optionnel)
                  </Text>
                  <TouchableOpacity
                    className="flex-row items-center justify-between rounded-xl border border-dashed border-gray p-4"
                    onPress={() => {
                      if (value) {
                        onChange("");
                        return;
                      }

                      onChange("permis_photo_01.jpg");
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={value ? "checkmark-circle-outline" : "cloud-upload-outline"}
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

            <View className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <Text className="text-xs text-muted-foreground">Recapitulatif</Text>
              <Text className="mt-1 text-sm">
                Type: {vehicleType === "moto" ? "Moto" : "Voiture"}
              </Text>
              <Text className="text-sm">Max passagers: {maxPassenger}</Text>
              <Text className="text-sm">
                Photo permis: {uploadedPhoto ? "Ajoutee" : "Non ajoutee"}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-gray bg-white px-5 pb-5 pt-3">
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onPress={goToPreviousStep}
          >
            <Text>{currentStep === 0 ? "Retour" : "Precedent"}</Text>
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button className="flex-1 rounded-xl" onPress={goToNextStep}>
              <Text>Continuer</Text>
            </Button>
          ) : (
            <Button className="flex-1 rounded-xl" onPress={onSubmit}>
              <Text>Ajouter le vehicule</Text>
            </Button>
          )}
        </View>
      </View>
    </View>
  );
};

export default ManageVehicleScreen;
